// 전투 시뮬레이션 — Rust(`combat-core/`)를 WebAssembly로 실행하는 얇은 TypeScript 래퍼.
// 상태와 연산은 Rust가 소유하고, 이 모듈은 엔티티 스냅샷을 JS 객체로 동기화해
// 렌더러·UI가 기존과 같은 형태(world.entities)로 읽을 수 있게 한다.
import { FACTIONS } from '../data/factions.ts';
import type { AttackDef, BuildingType, DamageType, FactionId, Size, Team, Trait, UnitType } from '../types.ts';

export const MAP = { halfX: 40, halfZ: 16 };
export const HQ_POS = [{ x: -34, z: 0 }, { x: 34, z: 0 }] as const;
export const RALLY_POS = [{ x: -26, z: 0 }, { x: 26, z: 0 }] as const;

export type OrderMode = 'hold' | 'attack' | 'move';
export interface Order { mode: OrderMode; x: number; z: number }

export interface Entity {
  readonly id: number;
  readonly team: Team;
  readonly factionId: FactionId;
  readonly kind: 'unit' | 'structure';
  readonly type: UnitType | BuildingType;
  readonly name: string;
  readonly size: Size;
  readonly radius: number;
  readonly maxHp: number;
  readonly maxShield: number;
  readonly armor: number;
  readonly speed: number;
  readonly attack: AttackDef | null;
  readonly supply: number;
  // 아래는 매 동기화 때 Rust 스냅샷에서 갱신
  x: number;
  z: number;
  hp: number;
  shield: number;
  cooldownLeft: number;
  order: Order;
  possessed: boolean;
}

export type CombatEvent =
  | { type: 'shot'; from: number; to: number; ranged: boolean }
  | { type: 'death'; id: number; team: Team; kind: Entity['kind']; supply: number };

export interface World {
  readonly handle: number;
  time: number;
  entities: Entity[];
  events: CombatEvent[];
  lastCombatAt: number;
  lastCombatPos: { x: number; z: number };
  readonly byId: Map<number, Entity>;
}

export type Command =
  | { mode: OrderMode; x?: number; z?: number }
  | { mode: 'target'; targetId: number };

// ---------- WASM 로딩 ----------

interface CoreExports {
  memory: WebAssembly.Memory;
  world_new(): number;
  world_free(h: number): void;
  world_spawn(h: number, team: number, structure: number, x: number, z: number, hp: number, shield: number,
    armor: number, size: number, speed: number, attackDamage: number, damageType: number, cooldown: number,
    range: number, trait: number): number;
  world_order(h: number, id: number, mode: number, x: number, z: number, targetId: number): void;
  world_step(h: number, dt: number): number;
  world_events_ptr(h: number): number;
  world_snapshot(h: number): number;
  world_snapshot_ptr(h: number): number;
  world_time(h: number): number;
  world_last_combat_at(h: number): number;
  world_last_combat_x(h: number): number;
  world_last_combat_z(h: number): number;
  world_set_possessed(h: number, id: number, on: number): void;
  world_possessed_move(h: number, id: number, dx: number, dz: number, dt: number): void;
  world_possessed_fire(h: number, id: number, targetId: number): number;
  world_debug_set(h: number, id: number, x: number, z: number, hp: number, speed: number): void;
  world_debug_set_attack(h: number, id: number, damage: number, cooldown: number, range: number): void;
}

const SNAPSHOT_STRIDE = 10; // combat-core/src/lib.rs와 일치해야 함
const EVENT_STRIDE = 4;

let core: CoreExports | null = null;

/** WASM 바이트로 전투 코어 초기화 (브라우저: fetch, Node 테스트: fs) */
export async function initCombatCore(bytes: BufferSource): Promise<void> {
  if (core) return;
  const { instance } = await WebAssembly.instantiate(bytes, {});
  core = instance.exports as unknown as CoreExports;
}

function c(): CoreExports {
  if (!core) throw new Error('전투 코어가 초기화되지 않았습니다. initCombatCore()를 먼저 호출하세요.');
  return core;
}

const f64 = (ptr: number, len: number) => new Float64Array(c().memory.buffer, ptr, len);

const SIZE_CODE: Record<Size, number> = { small: 0, medium: 1, large: 2 };
const DAMAGE_CODE: Record<DamageType, number> = { kinetic: 0, explosive: 1, plasma: 2 };
const TRAIT_CODE: Record<Trait, number> = { repair: 1, regen: 2, shield: 3 };
const MODE_CODE: Record<OrderMode | 'target', number> = { hold: 0, attack: 1, move: 2, target: 3 };
const MODE_NAME: OrderMode[] = ['hold', 'attack', 'move'];

// ---------- 월드 ----------

export function createWorld(): World {
  return {
    handle: c().world_new(),
    time: 0, entities: [], events: [], lastCombatAt: -999, lastCombatPos: { x: 0, z: 0 },
    byId: new Map(),
  };
}

export function destroyWorld(world: World): void {
  c().world_free(world.handle);
  world.entities = [];
  world.byId.clear();
}

/** Rust 상태 → JS 엔티티 동기화. 스냅샷에 없는 엔티티는 사망으로 제거 */
function sync(world: World): void {
  const k = c();
  const h = world.handle;
  const n = k.world_snapshot(h);
  const rows = f64(k.world_snapshot_ptr(h), n * SNAPSHOT_STRIDE);
  const next: Entity[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * SNAPSHOT_STRIDE;
    const e = world.byId.get(rows[o]);
    if (!e) continue;
    e.x = rows[o + 1];
    e.z = rows[o + 2];
    e.hp = rows[o + 3];
    e.shield = rows[o + 4];
    e.cooldownLeft = rows[o + 5];
    e.order.mode = MODE_NAME[rows[o + 6]];
    e.order.x = rows[o + 7];
    e.order.z = rows[o + 8];
    e.possessed = rows[o + 9] === 1;
    next.push(e);
  }
  if (next.length !== world.byId.size) {
    const alive = new Set(next.map((e) => e.id));
    for (const id of world.byId.keys()) if (!alive.has(id)) world.byId.delete(id);
  }
  world.entities = next;
  world.time = k.world_time(h);
  world.lastCombatAt = k.world_last_combat_at(h);
  world.lastCombatPos = { x: k.world_last_combat_x(h), z: k.world_last_combat_z(h) };
}

interface SpawnStats {
  team: Team; factionId: FactionId; kind: Entity['kind']; type: UnitType | BuildingType; name: string;
  x: number; z: number; hp: number; shield: number; armor: number; size: Size; speed: number;
  attack: AttackDef | null; supply: number;
}

function spawn(world: World, s: SpawnStats): Entity {
  const trait = FACTIONS[s.factionId].trait;
  const a = s.attack;
  const id = c().world_spawn(
    world.handle, s.team, s.kind === 'structure' ? 1 : 0, s.x, s.z, s.hp, s.shield, s.armor,
    SIZE_CODE[s.size], s.speed, a ? a.damage : -1, a ? DAMAGE_CODE[a.type] : 0, a?.cooldown ?? 0, a?.range ?? 0,
    TRAIT_CODE[trait],
  );
  const e: Entity = {
    id, team: s.team, factionId: s.factionId, kind: s.kind, type: s.type, name: s.name, size: s.size,
    radius: s.kind === 'structure' ? 2.5 : { small: 0.4, medium: 0.6, large: 0.8 }[s.size],
    maxHp: s.hp, maxShield: s.shield, armor: s.armor, speed: s.speed, attack: a, supply: s.supply,
    x: s.x, z: s.z, hp: s.hp, shield: s.shield, cooldownLeft: 0,
    order: { mode: 'hold', x: s.x, z: s.z }, possessed: false,
  };
  world.byId.set(id, e);
  sync(world);
  return e;
}

export function spawnStructure(world: World, team: Team, factionId: FactionId, type: BuildingType): Entity {
  const def = FACTIONS[factionId].buildings[type];
  const pos = HQ_POS[team];
  return spawn(world, {
    team, factionId, kind: 'structure', type, name: def.name, x: pos.x, z: pos.z,
    hp: def.hp, shield: def.shield ?? 0, armor: def.armor, size: 'large', speed: 0, attack: null, supply: 0,
  });
}

export function spawnUnit(world: World, team: Team, factionId: FactionId, unitType: UnitType): Entity {
  const def = FACTIONS[factionId].units[unitType];
  const rally = RALLY_POS[team];
  const e = spawn(world, {
    team, factionId, kind: 'unit', type: unitType, name: def.name,
    x: rally.x + (Math.random() - 0.5) * 3, z: rally.z + (Math.random() - 0.5) * 6,
    hp: def.hp, shield: def.shield, armor: def.armor, size: def.size, speed: def.speed,
    attack: def.attack ?? null, supply: def.supply,
  });
  orderUnits(world, [e.id], { mode: 'hold', x: rally.x, z: rally.z });
  return e;
}

/**
 * 개별 유닛 명령
 * - move: 적을 무시하고 이동, 도착 후 그 자리 방어(hold)
 * - attack: 공격 이동 (가는 길의 적과 교전)
 * - hold: 지점 방어 (사거리 내 적만 교전 후 복귀)
 * - target: 특정 적 집중 공격
 */
export function orderUnits(world: World, ids: number[], cmd: Command): void {
  const k = c();
  for (const id of ids) {
    if (cmd.mode === 'target') k.world_order(world.handle, id, MODE_CODE.target, NaN, NaN, cmd.targetId);
    else k.world_order(world.handle, id, MODE_CODE[cmd.mode], cmd.x ?? NaN, cmd.z ?? NaN, -1);
  }
  sync(world);
}

/** 팀 전체 명령: 'attack'(적 본진으로 진격) | 'hold'(집결지 방어) */
export function orderTeam(world: World, team: Team, mode: 'attack' | 'hold'): void {
  const dest = mode === 'attack' ? HQ_POS[team === 0 ? 1 : 0] : RALLY_POS[team];
  const ids = world.entities.filter((e) => e.team === team && e.kind === 'unit').map((e) => e.id);
  orderUnits(world, ids, { mode, x: dest.x, z: dest.z });
}

/** 마지막 교전 후 quietFor초가 지나지 않았으면 교전 중 */
export function inCombat(world: { time: number; lastCombatAt: number }, quietFor = 4): boolean {
  return world.time - world.lastCombatAt < quietFor;
}

export function stepCombat(world: World, dt: number): CombatEvent[] {
  const k = c();
  const n = k.world_step(world.handle, dt);
  const raw = f64(k.world_events_ptr(world.handle), n * EVENT_STRIDE);
  const events: CombatEvent[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * EVENT_STRIDE;
    if (raw[o] === 0) {
      events.push({ type: 'shot', from: raw[o + 1], to: raw[o + 2], ranged: raw[o + 3] === 1 });
    } else {
      const dead = world.byId.get(raw[o + 1]); // sync 전이라 아직 남아 있음
      if (dead) events.push({ type: 'death', id: dead.id, team: dead.team, kind: dead.kind, supply: dead.supply });
    }
  }
  sync(world);
  world.events = events;
  return events;
}

// ---------- 1인칭 빙의 ----------

export function setPossessed(world: World, id: number, on: boolean): void {
  c().world_set_possessed(world.handle, id, on ? 1 : 0);
  const e = world.byId.get(id);
  if (e) e.possessed = on;
}

/** 빙의 유닛 이동: (dx, dz)는 월드 기준 방향, 길이 1 이하로 정규화 */
export function possessedMove(world: World, e: Entity, dx: number, dz: number, dt: number): void {
  if (Math.hypot(dx, dz) < 1e-3) return;
  c().world_possessed_move(world.handle, e.id, dx, dz, dt);
  sync(world);
}

export type FireResult =
  | { ok: true; event: CombatEvent }
  | { ok: false; reason: 'cooldown' | 'no_target' | 'out_of_range' };

const FIRE_ERRORS = { [-1]: 'cooldown', [-2]: 'no_target', [-3]: 'out_of_range' } as const;

/** 빙의 유닛 사격: 조준한 대상에게 즉시 공격 (쿨다운·사거리 적용) */
export function possessedFire(world: World, e: Entity, target: Entity | null): FireResult {
  const code = c().world_possessed_fire(world.handle, e.id, target?.id ?? -1);
  if (code !== 1 || !target) return { ok: false, reason: FIRE_ERRORS[code as -1 | -2 | -3] ?? 'no_target' };
  sync(world);
  return { ok: true, event: { type: 'shot', from: e.id, to: target.id, ranged: (e.attack?.range ?? 0) > 2 } };
}

// ---------- 테스트·디버그 ----------

/** 상태 덮어쓰기 (지정하지 않은 값은 유지) */
export function debugSet(world: World, e: Entity, v: { x?: number; z?: number; hp?: number; speed?: number }): void {
  c().world_debug_set(world.handle, e.id, v.x ?? NaN, v.z ?? NaN, v.hp ?? NaN, v.speed ?? NaN);
  sync(world);
}

/** 공격 스탯 덮어쓰기 (null이면 공격 제거) */
export function debugSetAttack(world: World, e: Entity, a: { damage: number; cooldown: number; range: number } | null): void {
  c().world_debug_set_attack(world.handle, e.id, a ? a.damage : -1, a?.cooldown ?? 0, a?.range ?? 0);
  sync(world);
}
