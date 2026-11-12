//! Three Fronts 멀티플레이 서버.
//!
//! - `GET /ws`  WebSocket: 방 만들기(코드 발급) / 코드로 참가 → 1대1 게임
//! - 그 외 경로: 클라이언트 빌드(`dist/`) 정적 파일
//!
//! 게임마다 tokio 태스크 하나가 30Hz로 시뮬레이션하고, 15Hz로 각 플레이어에게 자기 시점 스냅샷을 보낸다.

pub mod economy;
pub mod factions;
pub mod game;
pub mod protocol;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tower_http::services::{ServeDir, ServeFile};

use factions::FactionId;
use game::{Game, TICK};
use protocol::{ClientMsg, ServerMsg};

/// 스냅샷 전송 주기 (틱 단위): 30Hz / 2 = 15Hz
const SNAPSHOT_EVERY: u32 = 2;

type Outbox = UnboundedSender<ServerMsg>;

enum Inbound {
    Msg(ClientMsg),
    Left,
}

/// 상대를 기다리는 방
struct PendingRoom {
    faction: FactionId,
    host: Outbox,
    cmd_tx: UnboundedSender<(u8, Inbound)>,
    cmd_rx: UnboundedReceiver<(u8, Inbound)>,
}

#[derive(Default)]
pub struct Lobby {
    rooms: Mutex<HashMap<String, PendingRoom>>,
}

pub type AppState = Arc<Lobby>;

pub fn app(static_dir: Option<PathBuf>) -> Router {
    let state: AppState = Arc::new(Lobby::default());
    let router = Router::new().route("/ws", get(ws_handler)).with_state(state);
    match static_dir {
        Some(dir) => {
            let index = dir.join("index.html");
            router.fallback_service(ServeDir::new(dir).fallback(ServeFile::new(index)))
        }
        None => router,
    }
}

async fn ws_handler(ws: WebSocketUpgrade, State(lobby): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| client(socket, lobby))
}

fn room_code(rooms: &HashMap<String, PendingRoom>) -> String {
    // 헷갈리는 글자(I, O, 0, 1) 제외
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    loop {
        let code: String = (0..4).map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char).collect();
        if !rooms.contains_key(&code) {
            return code;
        }
    }
}

/// 연결 하나: 송신 태스크 + 수신 루프
async fn client(socket: WebSocket, lobby: AppState) {
    let (mut sink, mut stream) = socket.split();
    let (out_tx, mut out_rx) = unbounded_channel::<ServerMsg>();
    let writer = tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            let Ok(text) = serde_json::to_string(&msg) else { continue };
            if sink.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    // 첫 메시지: 방 만들기 또는 참가
    let mut joined: Option<(u8, UnboundedSender<(u8, Inbound)>)> = None;
    let mut hosting: Option<String> = None;
    while let Some(Ok(frame)) = stream.next().await {
        let Message::Text(text) = frame else { continue };
        let Ok(msg) = serde_json::from_str::<ClientMsg>(&text) else {
            let _ = out_tx.send(ServerMsg::Error { reason: "잘못된 메시지".into() });
            continue;
        };
        if let Some((team, tx)) = &joined {
            if tx.send((*team, Inbound::Msg(msg))).is_err() {
                break; // 게임 종료됨
            }
            continue;
        }
        match msg {
            ClientMsg::Create { faction } => {
                let mut rooms = lobby.rooms.lock().unwrap();
                let code = room_code(&rooms);
                let (cmd_tx, cmd_rx) = unbounded_channel();
                rooms.insert(code.clone(), PendingRoom { faction, host: out_tx.clone(), cmd_tx: cmd_tx.clone(), cmd_rx });
                let _ = out_tx.send(ServerMsg::Room { code: code.clone(), team: 0 });
                joined = Some((0, cmd_tx));
                hosting = Some(code);
            }
            ClientMsg::Join { code, faction } => {
                let code = code.trim().to_uppercase();
                let room = lobby.rooms.lock().unwrap().remove(&code);
                let Some(room) = room else {
                    let _ = out_tx.send(ServerMsg::Error { reason: "방을 찾을 수 없습니다".into() });
                    continue;
                };
                let _ = out_tx.send(ServerMsg::Room { code, team: 1 });
                joined = Some((1, room.cmd_tx.clone()));
                tokio::spawn(run_game([room.faction, faction], [room.host, out_tx.clone()], room.cmd_rx));
            }
            _ => {
                let _ = out_tx.send(ServerMsg::Error { reason: "먼저 방을 만들거나 참가하세요".into() });
            }
        }
    }

    // 연결 종료: 대기 중인 방이면 삭제, 게임 중이면 상대에게 알림
    if let Some(code) = hosting {
        lobby.rooms.lock().unwrap().remove(&code);
    }
    if let Some((team, tx)) = joined {
        let _ = tx.send((team, Inbound::Left));
    }
    drop(out_tx);
    let _ = writer.await;
}

async fn run_game(factions: [FactionId; 2], outs: [Outbox; 2], mut cmds: UnboundedReceiver<(u8, Inbound)>) {
    // 개발·테스트용 배속 (GAME_SPEED=4 등). 기본 1배
    let speed: f64 = std::env::var("GAME_SPEED").ok().and_then(|v| v.parse().ok()).unwrap_or(1.0);
    let mut game = Game::new(factions, rand::random());
    for (team, out) in outs.iter().enumerate() {
        let _ = out.send(ServerMsg::Start { team: team as u8, factions });
    }
    let mut interval = tokio::time::interval(Duration::from_secs_f64(TICK));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut tick: u32 = 0;
    loop {
        interval.tick().await;
        while let Ok((team, inbound)) = cmds.try_recv() {
            match inbound {
                Inbound::Msg(msg) => {
                    if let Err(reason) = game.handle(team, msg) {
                        let _ = outs[team as usize].send(ServerMsg::Rejected { reason });
                    }
                }
                Inbound::Left => {
                    let _ = outs[1 - team as usize].send(ServerMsg::OpponentLeft);
                    return;
                }
            }
        }
        game.tick(TICK * speed);
        tick += 1;
        if tick.is_multiple_of(SNAPSHOT_EVERY) || game.winner.is_some() {
            let events = game.drain_events();
            for (team, out) in outs.iter().enumerate() {
                let _ = out.send(game.snapshot(team as u8, &events));
            }
        }
        if let Some(winner) = game.winner {
            for out in &outs {
                let _ = out.send(ServerMsg::Over { winner });
            }
            return;
        }
    }
}
