//! 전투 시뮬레이션: 타겟팅 · 이동 · 피해 계산 · 종족 특성 · 1인칭 빙의 조작.
//! 렌더링/입력과 분리된 순수 로직이며, `lib.rs`가 WebAssembly로 노출한다.

use std::collections::HashMap;

pub const HALF_X: f64 = 40.0;
pub const HALF_Z: f64 = 16.0;
pub const AGGRO_RANGE: f64 = 8.0;
pub const MIN_DAMAGE: f64 = 0.5;
pub const SHIELD_DELAY: f64 = 7.0;
pub const REPAIR_DELAY: f64 = 10.0;
pub const REGEN_RATE: f64 = 0.6;
pub const SHIELD_RATE: f64 = 2.0;
pub const REPAIR_RATE: f64 = 4.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Size {
    Small,
    Medium,
    Large,
}

impl Size {
    pub fn from_code(c: u32) -> Self {
        match c {
            0 => Size::Small,
            1 => Size::Medium,
            _ => Size::Large,
        }
    }
    fn radius(self) -> f64 {
        match self {
            Size::Small => 0.4,
            Size::Medium => 0.6,
            Size::Large => 0.8,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DamageType {
    Kinetic,
    Explosive,
    Plasma,
}

impl DamageType {
    pub fn from_code(c: u32) -> Self {
        match c {
            1 => DamageType::Explosive,
            2 => DamageType::Plasma,
            _ => DamageType::Kinetic,
        }
    }
    /// 공격 타입 × 크기 배율
    pub fn multiplier(self, size: Size) -> f64 {
        match (self, size) {
            (DamageType::Kinetic, _) => 1.0,
            (DamageType::Explosive, Size::Small) => 0.5,
            (DamageType::Explosive, Size::Medium) => 0.75,
            (DamageType::Explosive, Size::Large) => 1.0,
            (DamageType::Plasma, Size::Small) => 1.0,
            (DamageType::Plasma, Size::Medium) => 0.5,
            (DamageType::Plasma, Size::Large) => 0.25,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Trait {
    None,
    /// 건물 자동 수리
    Repair,
    /// 체력 재생
    Regen,
    /// 실드 재생만 (실드는 모든 종족 공통 규칙)
    Shield,
}

impl Trait {
    pub fn from_code(c: u32) -> Self {
        match c {
            1 => Trait::Repair,
            2 => Trait::Regen,
            3 => Trait::Shield,
            _ => Trait::None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Attack {
    pub damage: f64,
    pub kind: DamageType,
    pub cooldown: f64,
    pub range: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Hold,
    Attack,
    Move,
}

impl Mode {
    pub fn code(self) -> f64 {
        match self {
            Mode::Hold => 0.0,
            Mode::Attack => 1.0,
            Mode::Move => 2.0,
        }
    }
}

/// 유닛 명령
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Command {
    /// x/z가 None이면 현재 위치 유지
    Order { mode: Mode, x: Option<f64>, z: Option<f64> },
    /// 특정 적 집중 공격
    Target(u32),
}

#[derive(Clone, Debug)]
pub struct Entity {
    pub id: u32,
    pub team: u8,
    pub structure: bool,
    pub x: f64,
    pub z: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub shield: f64,
    pub max_shield: f64,
    pub armor: f64,
    pub size: Size,
    pub radius: f64,
    pub speed: f64,
    pub attack: Option<Attack>,
    pub trait_: Trait,
    pub cooldown_left: f64,
    pub last_hit_at: f64,
    pub dead: bool,
    pub target_id: Option<u32>,
    pub forced_target_id: Option<u32>,
    pub mode: Mode,
    pub order_x: f64,
    pub order_z: f64,
    /// 플레이어가 1인칭으로 조종 중이면 AI 행동을 건너뜀
    pub possessed: bool,
}

/// 스폰 시 전달하는 스탯
#[derive(Clone, Copy, Debug)]
pub struct Spawn {
    pub team: u8,
    pub structure: bool,
    pub x: f64,
    pub z: f64,
    pub hp: f64,
    pub shield: f64,
    pub armor: f64,
    pub size: Size,
    pub speed: f64,
    pub attack: Option<Attack>,
    pub trait_: Trait,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Event {
    Shot { from: u32, to: u32, ranged: bool },
    Death { id: u32 },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FireError {
    Cooldown,
    NoTarget,
    OutOfRange,
}

#[derive(Debug, Default)]
pub struct World {
    pub time: f64,
    pub entities: Vec<Entity>,
    pub events: Vec<Event>,
    pub last_combat_at: f64,
    pub last_combat_x: f64,
    pub last_combat_z: f64,
    next_id: u32,
}

/// 실드가 먼저 소모되고, 남은 피해에 타입 배율과 방어력 적용 (최소 피해 보장)
pub fn apply_damage(target: &mut Entity, raw: f64, kind: DamageType) {
    let mut remaining = raw;
    if target.shield > 0.0 {
        let absorbed = target.shield.min(remaining);
        target.shield -= absorbed;
        remaining -= absorbed;
    }
    if remaining > 0.0 {
        let dealt = (remaining * kind.multiplier(target.size) - target.armor).max(MIN_DAMAGE);
        target.hp -= dealt;
    }
}

/// 두 점 사이 거리. `f64::hypot`은 WASM에서 소프트웨어 구현(libm)이라 느려서
/// 네이티브 명령어(`f64.sqrt`)로 내려가는 sqrt를 직접 쓴다.
#[inline]
fn len(dx: f64, dz: f64) -> f64 {
    (dx * dx + dz * dz).sqrt()
}

#[inline]
fn dist(ax: f64, az: f64, bx: f64, bz: f64) -> f64 {
    len(ax - bx, az - bz)
}

fn move_toward(e: &mut Entity, tx: f64, tz: f64, dt: f64) {
    let dx = tx - e.x;
    let dz = tz - e.z;
    let d = len(dx, dz);
    if d < 0.05 {
        return;
    }
    let step = d.min(e.speed * dt);
    e.x += dx / d * step;
    e.z += dz / d * step;
}

fn clamp_to_map(e: &mut Entity) {
    e.x = e.x.clamp(-HALF_X, HALF_X);
    e.z = e.z.clamp(-HALF_Z, HALF_Z);
}

/// 공격자의 사거리 안에 대상이 있는가 (반지름 포함)
pub fn in_reach(a: &Entity, t: &Entity) -> bool {
    match a.attack {
        Some(atk) => dist(a.x, a.z, t.x, t.z) <= atk.range + a.radius + t.radius,
        None => false,
    }
}

impl World {
    pub fn new() -> Self {
        World { last_combat_at: -999.0, next_id: 1, ..Default::default() }
    }

    pub fn spawn(&mut self, s: Spawn) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        self.entities.push(Entity {
            id,
            team: s.team,
            structure: s.structure,
            x: s.x,
            z: s.z,
            hp: s.hp,
            max_hp: s.hp,
            shield: s.shield,
            max_shield: s.shield,
            armor: s.armor,
            size: s.size,
            radius: if s.structure { 2.5 } else { s.size.radius() },
            speed: s.speed,
            attack: s.attack,
            trait_: s.trait_,
            cooldown_left: 0.0,
            last_hit_at: -999.0,
            dead: false,
            target_id: None,
            forced_target_id: None,
            mode: Mode::Hold,
            order_x: s.x,
            order_z: s.z,
            possessed: false,
        });
        id
    }

    pub fn index_of(&self, id: u32) -> Option<usize> {
        self.entities.iter().position(|e| e.id == id)
    }

    pub fn get(&self, id: u32) -> Option<&Entity> {
        self.entities.iter().find(|e| e.id == id)
    }

    pub fn get_mut(&mut self, id: u32) -> Option<&mut Entity> {
        self.entities.iter_mut().find(|e| e.id == id)
    }

    pub fn order(&mut self, id: u32, cmd: Command) {
        let Some(e) = self.get_mut(id) else { return };
        if e.structure || e.dead {
            return;
        }
        e.target_id = None;
        match cmd {
            Command::Target(t) => e.forced_target_id = Some(t),
            Command::Order { mode, x, z } => {
                e.forced_target_id = None;
                e.mode = mode;
                e.order_x = x.unwrap_or(e.x);
                e.order_z = z.unwrap_or(e.z);
            }
        }
    }

    /// 마지막 교전 후 quiet_for초가 지나지 않았으면 교전 중
    pub fn in_combat(&self, quiet_for: f64) -> bool {
        self.time - self.last_combat_at < quiet_for
    }

    fn find_target(&self, i: usize) -> Option<usize> {
        let e = &self.entities[i];
        let mut best = None;
        let mut best_score = f64::INFINITY;
        for (j, o) in self.entities.iter().enumerate() {
            if o.dead || o.team == e.team {
                continue;
            }
            let d = dist(e.x, e.z, o.x, o.z) - o.radius;
            let siege = e.mode == Mode::Attack && o.structure && d < AGGRO_RANGE * 2.0;
            if d > AGGRO_RANGE && !siege {
                continue;
            }
            let score = d + if o.structure { 6.0 } else { 0.0 }; // 유닛 우선 공격
            if score < best_score {
                best_score = score;
                best = Some(j);
            }
        }
        best
    }

    fn apply_traits(&mut self, i: usize, dt: f64) {
        let time = self.time;
        let e = &mut self.entities[i];
        let since_hit = time - e.last_hit_at;
        if e.trait_ == Trait::Regen {
            e.hp = (e.hp + REGEN_RATE * dt).min(e.max_hp);
        }
        if e.max_shield > 0.0 && since_hit > SHIELD_DELAY {
            e.shield = (e.shield + SHIELD_RATE * dt).min(e.max_shield);
        }
        if e.trait_ == Trait::Repair && e.structure && since_hit > REPAIR_DELAY {
            e.hp = (e.hp + REPAIR_RATE * dt).min(e.max_hp);
        }
    }

    /// 공격자 i가 대상 j를 타격
    fn strike(&mut self, i: usize, j: usize) -> Event {
        let atk = self.entities[i].attack.expect("attacker has no attack");
        let time = self.time;
        {
            let t = &mut self.entities[j];
            apply_damage(t, atk.damage, atk.kind);
            t.last_hit_at = time;
        }
        let (ax, az, aid) = (self.entities[i].x, self.entities[i].z, self.entities[i].id);
        let (tx, tz, tid) = (self.entities[j].x, self.entities[j].z, self.entities[j].id);
        self.entities[i].cooldown_left = atk.cooldown;
        self.last_combat_at = time;
        self.last_combat_x = (ax + tx) / 2.0;
        self.last_combat_z = (az + tz) / 2.0;
        Event::Shot { from: aid, to: tid, ranged: atk.range > 2.0 }
    }

    fn separate(&mut self) {
        let n = self.entities.len();
        for i in 0..n {
            for j in (i + 1)..n {
                let (a, b) = (&self.entities[i], &self.entities[j]);
                let dx = b.x - a.x;
                let dz = b.z - a.z;
                let min = a.radius + b.radius;
                // 겹치지 않으면 sqrt 없이 바로 건너뜀
                if dx * dx + dz * dz >= min * min {
                    continue;
                }
                let d = {
                    let h = len(dx, dz);
                    if h == 0.0 { 0.001 } else { h }
                };
                {
                    let push = (min - d) / 2.0;
                    let (nx, nz) = (dx / d, dz / d);
                    if !self.entities[i].structure {
                        self.entities[i].x -= nx * push;
                        self.entities[i].z -= nz * push;
                    }
                    if !self.entities[j].structure {
                        self.entities[j].x += nx * push;
                        self.entities[j].z += nz * push;
                    }
                }
            }
        }
    }

    /// 시간 진행. 이번 스텝의 이벤트는 `self.events`에 담긴다.
    pub fn step(&mut self, dt: f64) {
        self.time += dt;
        self.events.clear();
        // 이번 스텝 동안 인덱스는 고정 (사망 처리는 마지막에 일괄)
        let index: HashMap<u32, usize> = self.entities.iter().enumerate().map(|(i, e)| (e.id, i)).collect();

        for i in 0..self.entities.len() {
            if self.entities[i].dead {
                continue;
            }
            self.apply_traits(i, dt);
            let e = &mut self.entities[i];
            if e.structure || e.attack.is_none() {
                continue;
            }
            e.cooldown_left = (e.cooldown_left - dt).max(0.0);
            if e.possessed {
                continue;
            }

            let mut target: Option<usize> = None;
            let forced = e.forced_target_id.and_then(|id| index.get(&id).copied());
            if let Some(j) = forced.filter(|&j| !self.entities[j].dead) {
                target = Some(j);
            } else {
                let e = &mut self.entities[i];
                e.forced_target_id = None;
                if e.mode == Mode::Move {
                    // 이동 명령: 적 무시, 도착하면 그 자리 방어
                    let (ox, oz) = (e.order_x, e.order_z);
                    move_toward(e, ox, oz, dt);
                    if dist(ox, oz, e.x, e.z) < 0.6 {
                        e.mode = Mode::Hold;
                    }
                } else {
                    let current = e.target_id.and_then(|id| index.get(&id).copied());
                    let keep = current.filter(|&j| {
                        let (a, t) = (&self.entities[i], &self.entities[j]);
                        !t.dead && dist(a.x, a.z, t.x, t.z) - t.radius <= AGGRO_RANGE * 1.5
                    });
                    target = keep.or_else(|| self.find_target(i));
                    let tid = target.map(|j| self.entities[j].id);
                    let e = &mut self.entities[i];
                    e.target_id = tid;
                    if target.is_none() {
                        let (ox, oz) = (e.order_x, e.order_z);
                        move_toward(e, ox, oz, dt);
                    }
                }
            }

            if let Some(j) = target {
                if !in_reach(&self.entities[i], &self.entities[j]) {
                    let (tx, tz) = (self.entities[j].x, self.entities[j].z);
                    move_toward(&mut self.entities[i], tx, tz, dt);
                } else if self.entities[i].cooldown_left == 0.0 {
                    let ev = self.strike(i, j);
                    self.events.push(ev);
                }
            }
            clamp_to_map(&mut self.entities[i]);
        }

        for e in self.entities.iter_mut() {
            if !e.dead && e.hp <= 0.0 {
                e.dead = true;
                self.events.push(Event::Death { id: e.id });
            }
        }
        self.entities.retain(|e| !e.dead);
        self.separate();
    }

    // ---------- 1인칭 빙의 ----------

    pub fn set_possessed(&mut self, id: u32, on: bool) {
        if let Some(e) = self.get_mut(id) {
            e.possessed = on;
        }
    }

    /// 빙의 유닛 이동: (dx, dz)는 월드 기준 방향, 길이 1 이하로 정규화
    pub fn possessed_move(&mut self, id: u32, dx: f64, dz: f64, dt: f64) {
        let Some(e) = self.get_mut(id) else { return };
        let l = len(dx, dz);
        if l < 1e-3 {
            return;
        }
        let k = l.min(1.0) / l;
        e.x += dx * k * e.speed * dt;
        e.z += dz * k * e.speed * dt;
        clamp_to_map(e);
    }

    /// 빙의 유닛 사격: 조준한 대상에게 즉시 공격 (쿨다운·사거리 적용)
    pub fn possessed_fire(&mut self, id: u32, target: Option<u32>) -> Result<Event, FireError> {
        let i = self.index_of(id).ok_or(FireError::NoTarget)?;
        let shooter = &self.entities[i];
        if shooter.attack.is_none() || shooter.cooldown_left > 0.0 {
            return Err(FireError::Cooldown);
        }
        let j = target.and_then(|t| self.index_of(t)).ok_or(FireError::NoTarget)?;
        let t = &self.entities[j];
        if t.dead || t.team == shooter.team {
            return Err(FireError::NoTarget);
        }
        if !in_reach(shooter, t) {
            return Err(FireError::OutOfRange);
        }
        Ok(self.strike(i, j))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unit(team: u8, x: f64, z: f64) -> Spawn {
        Spawn {
            team,
            structure: false,
            x,
            z,
            hp: 45.0,
            shield: 0.0,
            armor: 0.0,
            size: Size::Small,
            speed: 2.4,
            attack: Some(Attack { damage: 6.0, kind: DamageType::Kinetic, cooldown: 0.9, range: 4.0 }),
            trait_: Trait::None,
        }
    }

    #[test]
    fn shield_absorbs_first_then_multiplier_and_armor() {
        let mut w = World::new();
        let id = w.spawn(Spawn { hp: 100.0, shield: 10.0, armor: 1.0, size: Size::Large, ..unit(0, 0.0, 0.0) });
        let e = w.get_mut(id).unwrap();
        apply_damage(e, 30.0, DamageType::Plasma); // 10 실드, 20*0.25-1 = 4
        assert_eq!((e.shield, e.hp), (0.0, 96.0));
    }

    #[test]
    fn minimum_damage() {
        let mut w = World::new();
        let id = w.spawn(Spawn { hp: 10.0, armor: 5.0, ..unit(0, 0.0, 0.0) });
        let e = w.get_mut(id).unwrap();
        apply_damage(e, 2.0, DamageType::Kinetic);
        assert_eq!(e.hp, 9.5);
    }

    #[test]
    fn units_fight_and_die() {
        let mut w = World::new();
        let a = w.spawn(unit(0, 0.0, 0.0));
        let b = w.spawn(Spawn { hp: 5.0, ..unit(1, 3.0, 0.0) });
        w.step(0.1);
        assert!(matches!(w.events[0], Event::Shot { from, to, .. } if from == a && to == b));
        assert!(w.events.contains(&Event::Death { id: b }));
        assert!(w.get(b).is_none());
    }

    #[test]
    fn move_order_ignores_enemies_then_holds() {
        let mut w = World::new();
        let me = w.spawn(unit(0, 0.0, 0.0));
        let foe = w.spawn(Spawn { speed: 0.0, attack: None, ..unit(1, 2.0, 0.0) });
        w.order(me, Command::Order { mode: Mode::Move, x: Some(0.0), z: Some(10.0) });
        for _ in 0..60 {
            w.step(0.1);
        }
        let e = w.get(me).unwrap();
        assert!((e.z - 10.0).abs() < 0.7);
        assert_eq!(e.mode, Mode::Hold);
        assert_eq!(w.get(foe).unwrap().hp, 45.0);
    }

    #[test]
    fn possessed_unit_skips_ai_and_fire_rules() {
        let mut w = World::new();
        let me = w.spawn(unit(0, 0.0, 0.0));
        let foe = w.spawn(Spawn { speed: 0.0, attack: None, ..unit(1, 20.0, 0.0) });
        w.set_possessed(me, true);
        w.step(0.1);
        assert!(w.events.is_empty());
        assert_eq!(w.possessed_fire(me, Some(foe)), Err(FireError::OutOfRange));
        assert_eq!(w.possessed_fire(me, None), Err(FireError::NoTarget));
        w.possessed_move(me, 1.0, 0.0, 7.0); // 2.4 * 7 = 16.8 → 거리 3.2, 사거리 4.8
        assert!(w.possessed_fire(me, Some(foe)).is_ok());
        assert_eq!(w.possessed_fire(me, Some(foe)), Err(FireError::Cooldown));
        assert!(w.in_combat(4.0));
    }

    #[test]
    fn swarm_regen_and_shield_recharge() {
        let mut w = World::new();
        let r = w.spawn(Spawn { hp: 50.0, trait_: Trait::Regen, attack: None, ..unit(0, -20.0, 0.0) });
        let s = w.spawn(Spawn { shield: 40.0, trait_: Trait::Shield, attack: None, ..unit(0, 20.0, 0.0) });
        w.get_mut(r).unwrap().hp = 10.0;
        w.get_mut(s).unwrap().shield = 0.0;
        for _ in 0..10 {
            w.step(1.0);
        }
        assert!((w.get(r).unwrap().hp - 16.0).abs() < 1e-9);
        assert!(w.get(s).unwrap().shield > 0.0);
    }
}
