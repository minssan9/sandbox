//! 서버 권한(authoritative) 게임 상태: 양 팀의 경제 + `combat-core` 전투 월드.
//! 클라이언트는 명령만 보내고, 결과는 서버 스냅샷으로만 받는다.

use std::collections::HashMap;

use rand::{rngs::StdRng, Rng, SeedableRng};

use combat_core::world::{Command, Event, Mode, Size, Spawn, World};

use crate::economy::{Economy, WorkerTarget};
use crate::factions::{faction, BuildingType, FactionId, UnitType};
use crate::protocol::{ClientMsg, EntityKind, EntityView, EventOut, OrderMode, ServerMsg, TeamMode, WorkerTo};

pub const HQ_POS: [(f64, f64); 2] = [(-34.0, 0.0), (34.0, 0.0)];
pub const RALLY_POS: [(f64, f64); 2] = [(-26.0, 0.0), (26.0, 0.0)];
/// 서버 시뮬레이션 간격 (초)
pub const TICK: f64 = 1.0 / 30.0;

#[derive(Clone, Copy, Debug, Default)]
pub struct Input {
    pub dx: f64,
    pub dz: f64,
    pub firing: bool,
    pub aim: Option<u32>,
}

pub struct Player {
    pub faction: FactionId,
    pub eco: Economy,
    pub possessed: Option<u32>,
    pub input: Input,
}

#[derive(Clone, Debug)]
struct Meta {
    team: u8,
    faction: FactionId,
    kind: EntityKind,
    ty: &'static str,
    supply: f64,
}

pub struct Game {
    pub world: World,
    pub players: [Player; 2],
    meta: HashMap<u32, Meta>,
    pub elapsed: f64,
    pub winner: Option<u8>,
    /// 마지막 스냅샷 이후 쌓인 이벤트
    pending: Vec<EventOut>,
    rng: StdRng,
}

fn unit_name(t: UnitType) -> &'static str {
    match t {
        UnitType::Worker => "worker",
        UnitType::Infantry => "infantry",
        UnitType::Ranged => "ranged",
    }
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

impl Game {
    pub fn new(factions: [FactionId; 2], seed: u64) -> Self {
        let mut g = Game {
            world: World::new(),
            players: factions.map(|f| Player { faction: f, eco: Economy::new(f), possessed: None, input: Input::default() }),
            meta: HashMap::new(),
            elapsed: 0.0,
            winner: None,
            pending: Vec::new(),
            rng: StdRng::seed_from_u64(seed),
        };
        for team in 0..2u8 {
            g.spawn_hq(team);
        }
        g
    }

    fn spawn_hq(&mut self, team: u8) {
        let fid = self.players[team as usize].faction;
        let f = faction(fid);
        let def = f.building(BuildingType::Hq);
        let (x, z) = HQ_POS[team as usize];
        let id = self.world.spawn(Spawn {
            team,
            structure: true,
            x,
            z,
            hp: def.hp,
            shield: def.shield.unwrap_or(0.0),
            armor: def.armor,
            size: Size::Large,
            speed: 0.0,
            attack: None,
            trait_: f.combat_trait(),
        });
        self.meta.insert(id, Meta { team, faction: fid, kind: EntityKind::Structure, ty: "hq", supply: 0.0 });
    }

    pub fn spawn_unit(&mut self, team: u8, t: UnitType) -> u32 {
        let fid = self.players[team as usize].faction;
        let f = faction(fid);
        let def = f.unit(t);
        let (rx, rz) = RALLY_POS[team as usize];
        let x = rx + (self.rng.gen::<f64>() - 0.5) * 3.0;
        let z = rz + (self.rng.gen::<f64>() - 0.5) * 6.0;
        let id = self.world.spawn(Spawn {
            team,
            structure: false,
            x,
            z,
            hp: def.hp,
            shield: def.shield,
            armor: def.armor,
            size: def.size.to_size(),
            speed: def.speed,
            attack: def.attack.map(|a| a.to_attack()),
            trait_: f.combat_trait(),
        });
        self.world.order(id, Command::Order { mode: Mode::Hold, x: Some(rx), z: Some(rz) });
        self.meta.insert(id, Meta { team, faction: fid, kind: EntityKind::Unit, ty: unit_name(t), supply: def.supply });
        id
    }

    fn owns_unit(&self, team: u8, id: u32) -> bool {
        self.meta.get(&id).is_some_and(|m| m.team == team && m.kind == EntityKind::Unit)
            && self.world.get(id).is_some()
    }

    /// 플레이어 명령 처리. Err는 클라이언트에 `Rejected`로 전달된다.
    pub fn handle(&mut self, team: u8, msg: ClientMsg) -> Result<(), String> {
        if self.winner.is_some() {
            return Ok(());
        }
        let ti = team as usize;
        match msg {
            ClientMsg::Create { .. } | ClientMsg::Join { .. } => Err("이미 게임 중".into()),
            ClientMsg::Build { building } => {
                if building == BuildingType::Hq {
                    return Err("본진은 추가로 지을 수 없음".into());
                }
                self.players[ti].eco.queue_building(building).map(|_| ())
            }
            ClientMsg::Train { building_id, unit } => self.players[ti].eco.queue_unit(building_id, unit),
            ClientMsg::Worker { to } => {
                let target = if to == WorkerTo::Gas { WorkerTarget::Gas } else { WorkerTarget::Ore };
                if self.players[ti].eco.move_worker(target) {
                    Ok(())
                } else {
                    Err(if to == WorkerTo::Gas { "가스 건물 필요 또는 정원 초과" } else { "가스 일꾼 없음" }.into())
                }
            }
            ClientMsg::OrderTeam { mode } => {
                let (mode, (x, z)) = match mode {
                    TeamMode::Attack => (Mode::Attack, HQ_POS[1 - ti]),
                    TeamMode::Hold => (Mode::Hold, RALLY_POS[ti]),
                };
                let ids: Vec<u32> = self
                    .meta
                    .iter()
                    .filter(|(id, m)| m.team == team && m.kind == EntityKind::Unit && self.world.get(**id).is_some())
                    .map(|(id, _)| *id)
                    .collect();
                for id in ids {
                    self.world.order(id, Command::Order { mode, x: Some(x), z: Some(z) });
                }
                Ok(())
            }
            ClientMsg::Order { ids, mode, x, z, target_id } => {
                let cmd = match mode {
                    OrderMode::Target => Command::Target(target_id.ok_or("대상 없음")?),
                    OrderMode::Hold => Command::Order { mode: Mode::Hold, x, z },
                    OrderMode::Attack => Command::Order { mode: Mode::Attack, x, z },
                    OrderMode::Move => Command::Order { mode: Mode::Move, x, z },
                };
                let mine: Vec<u32> = ids.into_iter().filter(|id| self.owns_unit(team, *id)).collect();
                for id in mine {
                    self.world.order(id, cmd);
                }
                Ok(())
            }
            ClientMsg::Possess { id } => {
                if let Some(prev) = self.players[ti].possessed.take() {
                    self.world.set_possessed(prev, false);
                    self.world.order(prev, Command::Order { mode: Mode::Hold, x: None, z: None });
                }
                self.players[ti].input = Input::default();
                if let Some(id) = id {
                    if !self.owns_unit(team, id) {
                        return Err("빙의할 수 없는 유닛".into());
                    }
                    self.world.set_possessed(id, true);
                    self.players[ti].possessed = Some(id);
                }
                Ok(())
            }
            ClientMsg::Input { dx, dz, firing, aim } => {
                // 이동 방향은 길이 1로 제한 (속도 조작 방지)
                let len = dx.hypot(dz);
                let k = if len > 1.0 { 1.0 / len } else { 1.0 };
                self.players[ti].input = Input { dx: dx * k, dz: dz * k, firing, aim };
                Ok(())
            }
        }
    }

    /// 한 틱 진행
    pub fn tick(&mut self, dt: f64) {
        if self.winner.is_some() {
            return;
        }
        self.elapsed += dt;
        for team in 0..2u8 {
            for t in self.players[team as usize].eco.tick(dt) {
                self.spawn_unit(team, t);
            }
        }

        for ti in 0..2 {
            let Some(id) = self.players[ti].possessed else { continue };
            if self.world.get(id).is_none() {
                self.players[ti].possessed = None;
                continue;
            }
            let input = self.players[ti].input;
            self.world.possessed_move(id, input.dx, input.dz, dt);
            if input.firing {
                if let Ok(Event::Shot { from, to, ranged }) = self.world.possessed_fire(id, input.aim) {
                    self.pending.push(EventOut::Shot { from, to, ranged });
                }
            }
        }

        self.world.step(dt);
        let events = std::mem::take(&mut self.world.events);
        for ev in events {
            match ev {
                Event::Shot { from, to, ranged } => self.pending.push(EventOut::Shot { from, to, ranged }),
                Event::Death { id } => {
                    let Some(m) = self.meta.remove(&id) else { continue };
                    if m.kind == EntityKind::Structure {
                        self.winner = Some(1 - m.team);
                    } else {
                        self.players[m.team as usize].eco.release_unit(m.supply);
                    }
                    self.pending.push(EventOut::Death { id, team: m.team, kind: m.kind, supply: m.supply });
                }
            }
        }
        for p in self.players.iter_mut() {
            if p.possessed.is_some_and(|id| self.world.get(id).is_none()) {
                p.possessed = None;
            }
        }
    }

    /// 팀 시점 스냅샷. 쌓인 이벤트는 양 팀에 같은 것을 보내야 하므로 `drain_events`와 분리.
    pub fn snapshot(&self, team: u8, events: &[EventOut]) -> ServerMsg {
        let entities = self
            .world
            .entities
            .iter()
            .filter_map(|e| {
                let m = self.meta.get(&e.id)?;
                Some(EntityView {
                    id: e.id,
                    team: m.team,
                    f: m.faction,
                    k: m.kind,
                    ty: m.ty.to_string(),
                    x: round2(e.x),
                    z: round2(e.z),
                    hp: round2(e.hp),
                    sh: round2(e.shield),
                    cd: round2(e.cooldown_left),
                    m: e.mode.code() as u8,
                    p: e.possessed,
                })
            })
            .collect();
        ServerMsg::State {
            time: self.world.time,
            elapsed: self.elapsed,
            last_combat_at: self.world.last_combat_at,
            last_combat_x: self.world.last_combat_x,
            last_combat_z: self.world.last_combat_z,
            eco: self.players[team as usize].eco.clone(),
            entities,
            events: events.to_vec(),
            possessed: self.players[team as usize].possessed,
        }
    }

    pub fn drain_events(&mut self) -> Vec<EventOut> {
        std::mem::take(&mut self.pending)
    }

    pub fn unit_count(&self, team: u8) -> usize {
        self.meta.values().filter(|m| m.team == team && m.kind == EntityKind::Unit).count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rich_game() -> Game {
        let mut g = Game::new([FactionId::Coalition, FactionId::Swarm], 1);
        for p in g.players.iter_mut() {
            p.eco.ore = 100_000.0;
            p.eco.gas = 100_000.0;
        }
        g
    }

    fn factory(g: &mut Game, team: u8) -> u32 {
        g.handle(team, ClientMsg::Build { building: BuildingType::Factory }).unwrap();
        g.handle(team, ClientMsg::Build { building: BuildingType::Supply }).unwrap();
        for _ in 0..(40.0 / TICK) as usize {
            g.tick(TICK);
        }
        g.players[team as usize].eco.buildings.iter().find(|b| b.kind == BuildingType::Factory).unwrap().id
    }

    #[test]
    fn trains_units_into_combat_world() {
        let mut g = rich_game();
        let f = factory(&mut g, 0);
        g.handle(0, ClientMsg::Train { building_id: f, unit: UnitType::Infantry }).unwrap();
        for _ in 0..(16.0 / TICK) as usize {
            g.tick(TICK);
        }
        assert_eq!(g.unit_count(0), 1);
        assert_eq!(g.players[0].eco.army, 1);
    }

    #[test]
    fn rejects_bad_commands() {
        let mut g = Game::new([FactionId::Coalition, FactionId::Swarm], 1);
        assert_eq!(g.handle(0, ClientMsg::Build { building: BuildingType::Factory }), Err("자원 부족".into()));
        assert!(g.handle(0, ClientMsg::Build { building: BuildingType::Hq }).is_err());
        let enemy_hq = g.world.entities.iter().find(|e| e.team == 1).unwrap().id;
        assert!(g.handle(0, ClientMsg::Possess { id: Some(enemy_hq) }).is_err(), "적 유닛/건물 빙의 불가");
    }

    #[test]
    fn cannot_order_enemy_units() {
        let mut g = rich_game();
        let foe = g.spawn_unit(1, UnitType::Infantry);
        let before = g.world.get(foe).unwrap().order_x;
        g.handle(0, ClientMsg::Order { ids: vec![foe], mode: OrderMode::Move, x: Some(0.0), z: Some(0.0), target_id: None })
            .unwrap();
        assert_eq!(g.world.get(foe).unwrap().order_x, before);
    }

    #[test]
    fn possession_moves_and_fires_with_clamped_input() {
        let mut g = rich_game();
        let me = g.spawn_unit(0, UnitType::Infantry);
        let start_x = g.world.get(me).unwrap().x;
        g.handle(0, ClientMsg::Possess { id: Some(me) }).unwrap();
        g.handle(0, ClientMsg::Input { dx: 100.0, dz: 0.0, firing: false, aim: None }).unwrap();
        g.tick(1.0);
        let moved = g.world.get(me).unwrap().x - start_x;
        assert!((moved - 2.4).abs() < 1e-6, "속도 조작 불가: {moved}");
        // 빙의 해제하면 AI로 복귀
        g.handle(0, ClientMsg::Possess { id: None }).unwrap();
        assert!(!g.world.get(me).unwrap().possessed);
    }

    #[test]
    fn destroying_hq_ends_game() {
        let mut g = rich_game();
        for _ in 0..15 {
            g.spawn_unit(0, UnitType::Ranged);
        }
        g.handle(0, ClientMsg::OrderTeam { mode: TeamMode::Attack }).unwrap();
        for _ in 0..(300.0 / TICK) as usize {
            g.tick(TICK);
            if g.winner.is_some() {
                break;
            }
        }
        assert_eq!(g.winner, Some(0));
        let events = g.drain_events();
        assert!(events.iter().any(|e| matches!(e, EventOut::Death { kind: EntityKind::Structure, team: 1, .. })));
    }

    #[test]
    fn snapshot_hides_enemy_economy() {
        let g = Game::new([FactionId::Coalition, FactionId::Ascendant], 1);
        let ServerMsg::State { eco, entities, .. } = g.snapshot(1, &[]) else { panic!() };
        assert_eq!(eco.faction_id, FactionId::Ascendant);
        assert_eq!(entities.len(), 2); // 양쪽 본진은 공개
    }
}
