//! WebSocket 통합 테스트: 실제 서버를 띄우고 두 클라이언트가 방을 만들고 참가해 게임한다.

use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};

type Ws = WebSocketStream<MaybeTlsStream<TcpStream>>;

async fn start_server() -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, server::app(None)).await.unwrap() });
    format!("ws://{addr}/ws")
}

async fn send(ws: &mut Ws, v: Value) {
    ws.send(Message::Text(v.to_string().into())).await.unwrap();
}

/// 조건을 만족하는 메시지가 올 때까지 읽기 (최대 5초)
async fn wait_for(ws: &mut Ws, pred: impl Fn(&Value) -> bool) -> Value {
    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            let Some(Ok(Message::Text(t))) = ws.next().await else { continue };
            let v: Value = serde_json::from_str(&t).unwrap();
            if pred(&v) {
                return v;
            }
        }
    })
    .await
    .expect("메시지 대기 시간 초과")
}

#[tokio::test]
async fn two_players_create_join_and_play() {
    let url = start_server().await;
    let (mut a, _) = connect_async(&url).await.unwrap();
    let (mut b, _) = connect_async(&url).await.unwrap();

    send(&mut a, json!({"t": "create", "faction": "coalition"})).await;
    let room = wait_for(&mut a, |v| v["t"] == "room").await;
    assert_eq!(room["team"], 0);
    let code = room["code"].as_str().unwrap().to_string();
    assert_eq!(code.len(), 4);

    send(&mut b, json!({"t": "join", "code": code.to_lowercase(), "faction": "swarm"})).await;
    assert_eq!(wait_for(&mut b, |v| v["t"] == "room").await["team"], 1);

    let start_a = wait_for(&mut a, |v| v["t"] == "start").await;
    let start_b = wait_for(&mut b, |v| v["t"] == "start").await;
    assert_eq!(start_a["team"], 0);
    assert_eq!(start_b["team"], 1);
    assert_eq!(start_b["factions"], json!(["coalition", "swarm"]));

    // 각자 자기 경제만 받는다
    let st_a = wait_for(&mut a, |v| v["t"] == "state").await;
    let st_b = wait_for(&mut b, |v| v["t"] == "state").await;
    assert_eq!(st_a["eco"]["factionId"], "coalition");
    assert_eq!(st_b["eco"]["factionId"], "swarm");
    assert_eq!(st_a["entities"].as_array().unwrap().len(), 2);

    // 자원 부족 명령은 거부 사유가 돌아온다
    send(&mut a, json!({"t": "build", "building": "factory"})).await;
    let rej = wait_for(&mut a, |v| v["t"] == "rejected").await;
    assert_eq!(rej["reason"], "자원 부족");

    // 한쪽이 나가면 상대에게 알림
    a.close(None).await.unwrap();
    wait_for(&mut b, |v| v["t"] == "opponentLeft").await;
}

#[tokio::test]
async fn joining_unknown_room_errors() {
    let url = start_server().await;
    let (mut c, _) = connect_async(&url).await.unwrap();
    send(&mut c, json!({"t": "join", "code": "ZZZZ", "faction": "swarm"})).await;
    let err = wait_for(&mut c, |v| v["t"] == "error").await;
    assert_eq!(err["reason"], "방을 찾을 수 없습니다");
}
