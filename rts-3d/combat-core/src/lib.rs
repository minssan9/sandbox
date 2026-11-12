//! Three Fronts 전투 코어 — WebAssembly용 숫자 기반 C ABI.
//!
//! JS 쪽(`src/sim/combat.ts`)이 `world_new`로 받은 핸들을 모든 호출에 넘긴다.
//! 상태 조회는 공유 메모리 버퍼로 한다:
//! - 스냅샷: 엔티티마다 [`SNAPSHOT_STRIDE`]개의 f64
//!   `[id, x, z, hp, shield, cooldown_left, mode, order_x, order_z, possessed]`
//! - 이벤트: 이벤트마다 [`EVENT_STRIDE`]개의 f64
//!   발사 `[0, from, to, ranged]`, 사망 `[1, id, 0, 0]`

pub mod world;

use world::{Attack, Command, DamageType, Event, FireError, Mode, Size, Spawn, Trait, World};

pub const SNAPSHOT_STRIDE: usize = 10;
pub const EVENT_STRIDE: usize = 4;

/// FFI 핸들: 월드 + JS가 읽어갈 버퍼
pub struct Handle {
    world: World,
    snapshot: Vec<f64>,
    events: Vec<f64>,
}

/// # Safety
/// `h`는 `world_new`가 반환했고 아직 `world_free`되지 않은 핸들이어야 한다.
unsafe fn handle<'a>(h: *mut Handle) -> &'a mut Handle {
    &mut *h
}

fn opt_id(id: f64) -> Option<u32> {
    (id >= 0.0).then_some(id as u32)
}

fn opt_coord(v: f64) -> Option<f64> {
    (!v.is_nan()).then_some(v)
}

#[no_mangle]
pub extern "C" fn world_new() -> *mut Handle {
    Box::into_raw(Box::new(Handle { world: World::new(), snapshot: Vec::new(), events: Vec::new() }))
}

/// # Safety
/// 유효한 핸들을 한 번만 해제해야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_free(h: *mut Handle) {
    if !h.is_null() {
        drop(Box::from_raw(h));
    }
}

/// 엔티티 생성. `attack_damage < 0`이면 공격 없음.
/// size: 0 small / 1 medium / 2 large, damage_type: 0 kinetic / 1 explosive / 2 plasma,
/// trait: 0 none / 1 repair / 2 regen / 3 shield
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
#[allow(clippy::too_many_arguments)]
pub unsafe extern "C" fn world_spawn(
    h: *mut Handle,
    team: u32,
    structure: u32,
    x: f64,
    z: f64,
    hp: f64,
    shield: f64,
    armor: f64,
    size: u32,
    speed: f64,
    attack_damage: f64,
    damage_type: u32,
    cooldown: f64,
    range: f64,
    trait_code: u32,
) -> u32 {
    let attack = (attack_damage >= 0.0).then_some(Attack {
        damage: attack_damage,
        kind: DamageType::from_code(damage_type),
        cooldown,
        range,
    });
    handle(h).world.spawn(Spawn {
        team: team as u8,
        structure: structure != 0,
        x,
        z,
        hp,
        shield,
        armor,
        size: Size::from_code(size),
        speed,
        attack,
        trait_: Trait::from_code(trait_code),
    })
}

/// 명령. mode: 0 hold / 1 attack / 2 move / 3 target(target_id 사용).
/// x/z가 NaN이면 현재 위치 유지.
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_order(h: *mut Handle, id: u32, mode: u32, x: f64, z: f64, target_id: f64) {
    let cmd = match mode {
        3 => match opt_id(target_id) {
            Some(t) => Command::Target(t),
            None => return,
        },
        m => Command::Order {
            mode: match m {
                1 => Mode::Attack,
                2 => Mode::Move,
                _ => Mode::Hold,
            },
            x: opt_coord(x),
            z: opt_coord(z),
        },
    };
    handle(h).world.order(id, cmd);
}

fn write_events(hd: &mut Handle) -> u32 {
    hd.events.clear();
    for ev in &hd.world.events {
        match *ev {
            Event::Shot { from, to, ranged } => {
                hd.events.extend_from_slice(&[0.0, from as f64, to as f64, if ranged { 1.0 } else { 0.0 }])
            }
            Event::Death { id } => hd.events.extend_from_slice(&[1.0, id as f64, 0.0, 0.0]),
        }
    }
    hd.world.events.len() as u32
}

/// 시간 진행. 반환값: 이번 스텝의 이벤트 수 (`world_events_ptr`로 읽음)
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_step(h: *mut Handle, dt: f64) -> u32 {
    let hd = handle(h);
    hd.world.step(dt);
    write_events(hd)
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_events_ptr(h: *mut Handle) -> *const f64 {
    handle(h).events.as_ptr()
}

/// 스냅샷 갱신. 반환값: 엔티티 수 (`world_snapshot_ptr`로 읽음)
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_snapshot(h: *mut Handle) -> u32 {
    let hd = handle(h);
    hd.snapshot.clear();
    for e in &hd.world.entities {
        hd.snapshot.extend_from_slice(&[
            e.id as f64,
            e.x,
            e.z,
            e.hp,
            e.shield,
            e.cooldown_left,
            e.mode.code(),
            e.order_x,
            e.order_z,
            if e.possessed { 1.0 } else { 0.0 },
        ]);
    }
    hd.world.entities.len() as u32
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_snapshot_ptr(h: *mut Handle) -> *const f64 {
    handle(h).snapshot.as_ptr()
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_time(h: *mut Handle) -> f64 {
    handle(h).world.time
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_last_combat_at(h: *mut Handle) -> f64 {
    handle(h).world.last_combat_at
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_last_combat_x(h: *mut Handle) -> f64 {
    handle(h).world.last_combat_x
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_last_combat_z(h: *mut Handle) -> f64 {
    handle(h).world.last_combat_z
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_set_possessed(h: *mut Handle, id: u32, on: u32) {
    handle(h).world.set_possessed(id, on != 0);
}

/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_possessed_move(h: *mut Handle, id: u32, dx: f64, dz: f64, dt: f64) {
    handle(h).world.possessed_move(id, dx, dz, dt);
}

/// 빙의 사격. 반환값: 1 성공 / -1 쿨다운 / -2 대상 없음 / -3 사거리 밖
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_possessed_fire(h: *mut Handle, id: u32, target_id: f64) -> i32 {
    match handle(h).world.possessed_fire(id, opt_id(target_id)) {
        Ok(_) => 1,
        Err(FireError::Cooldown) => -1,
        Err(FireError::NoTarget) => -2,
        Err(FireError::OutOfRange) => -3,
    }
}

/// 디버그·테스트용 상태 덮어쓰기. NaN인 값은 바꾸지 않음.
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_debug_set(h: *mut Handle, id: u32, x: f64, z: f64, hp: f64, speed: f64) {
    if let Some(e) = handle(h).world.get_mut(id) {
        if !x.is_nan() { e.x = x; }
        if !z.is_nan() { e.z = z; }
        if !hp.is_nan() { e.hp = hp; }
        if !speed.is_nan() { e.speed = speed; }
    }
}

/// 디버그·테스트용 공격 스탯 덮어쓰기 (`damage < 0`이면 공격 제거)
///
/// # Safety
/// 유효한 핸들이어야 한다.
#[no_mangle]
pub unsafe extern "C" fn world_debug_set_attack(h: *mut Handle, id: u32, damage: f64, cooldown: f64, range: f64) {
    if let Some(e) = handle(h).world.get_mut(id) {
        e.attack = (damage >= 0.0).then(|| Attack {
            damage,
            kind: e.attack.map_or(DamageType::Kinetic, |a| a.kind),
            cooldown,
            range,
        });
    }
}
