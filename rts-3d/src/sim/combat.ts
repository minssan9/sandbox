// 3D 실시간 전투 시뮬레이션 (렌더링과 분리된 순수 로직)
import { FACTIONS, TRAIT_RATES, SHIELD_DELAY } from '../data/factions.ts';
import { applyDamage } from '../data/rules.ts';
import type { AttackDef, BuildingType, FactionId, Size, Team, UnitType } from '../types.ts';

export const MAP = { halfX: 40, halfZ: 16 };
export const HQ_POS = [{ x: -34, z: 0 }, { x: 34, z: 0 }] as const;
export const RALLY_POS = [{ x: -26, z: 0 }, { x: 26, z: 0 }] as const;
export const AGGRO_RANGE = 8;
const RADIUS: Record<Size | 'structure', number> = { small: 0.4, medium: 0.6, large: 0.8, structure: 2.5 };
const REPAIR_DELAY = 10;

export type OrderMode = 'hold' | 'attack' | 'move';
export interface Order { mode: OrderMode; x: number; z: number }

export interface Entity {
  id: number;
  team: Team;
  factionId: FactionId;
  kind: 'unit' | 'structure';
  type: UnitType | BuildingType;
  name: string;
  x: number;
  z: number;
  size: Size;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  armor: number;
  speed: number;
  attack: AttackDef | null;
  supply: number;
  cooldownLeft: number;
  lastHitAt: number;
  dead: boolean;
  targetId: number | null;
  forcedTargetId: number | null;
  order: Order;
  /** 플레이어가 1인칭으로 직접 조종 중이면 AI 행동을 건너뜀 */
  possessed: boolean;
}

export type CombatEvent =
  | { type: 'shot'; from: number; to: number; ranged: boolean }
  | { type: 'death'; id: number; team: Team; kind: Entity['kind']; supply: number };

export interface World {
  time: number;
  entities: Entity[];
  events: CombatEvent[];
  lastCombatAt: number;
  lastCombatPos: { x: number; z: number };
}

export type Command =
  | { mode: OrderMode; x?: number; z?: number }
  | { mode: 'target'; targetId: number };

let nextId = 1;

export function createWorld(): World {
  // lastCombatAt/lastCombatPos: 교전 감지용 (3D 자동 전환 트리거)
  return { time: 0, entities: [], events: [], lastCombatAt: -999, lastCombatPos: { x: 0, z: 0 } };
}

function baseEntity(team: Team, factionId: FactionId, x: number, z: number): Omit<Entity, 'kind' | 'type' | 'name' | 'size' | 'radius' | 'hp' | 'maxHp' | 'shield' | 'maxShield' | 'armor' | 'speed' | 'attack' | 'supply'> {
  return {
    id: nextId++, team, factionId, x, z,
    cooldownLeft: 0, lastHitAt: -999, dead: false, targetId: null, forcedTargetId: null,
    order: { mode: 'hold', x, z }, possessed: false,
  };
}

export function spawnStructure(world: World, team: Team, factionId: FactionId, type: BuildingType): Entity {
  const def = FACTIONS[factionId].buildings[type];
  const pos = HQ_POS[team];
  const e: Entity = {
    ...baseEntity(team, factionId, pos.x, pos.z),
    kind: 'structure', type, name: def.name, size: 'large', radius: RADIUS.structure,
    hp: def.hp, maxHp: def.hp, shield: def.shield ?? 0, maxShield: def.shield ?? 0,
    armor: def.armor, speed: 0, attack: null, supply: 0,
  };
  world.entities.push(e);
  return e;
}

export function spawnUnit(world: World, team: Team, factionId: FactionId, unitType: UnitType): Entity {
  const def = FACTIONS[factionId].units[unitType];
  const rally = RALLY_POS[team];
  const e: Entity = {
    ...baseEntity(team, factionId, rally.x + (Math.random() - 0.5) * 3, rally.z + (Math.random() - 0.5) * 6),
    kind: 'unit', type: unitType, name: def.name, size: def.size, radius: RADIUS[def.size],
    hp: def.hp, maxHp: def.hp, shield: def.shield, maxShield: def.shield,
    armor: def.armor, speed: def.speed, attack: def.attack ?? null, supply: def.supply,
  };
  e.order = { mode: 'hold', x: rally.x, z: rally.z };
  world.entities.push(e);
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
  const set = new Set(ids);
  for (const e of world.entities) {
    if (!set.has(e.id) || e.kind !== 'unit' || e.dead) continue;
    e.targetId = null;
    if (cmd.mode === 'target') {
      e.forcedTargetId = cmd.targetId;
      continue;
    }
    e.forcedTargetId = null;
    e.order = { mode: cmd.mode, x: cmd.x ?? e.x, z: cmd.z ?? e.z };
  }
}

/** 팀 전체 명령: 'attack'(적 본진으로 진격) | 'hold'(집결지 방어) */
export function orderTeam(world: World, team: Team, mode: 'attack' | 'hold'): void {
  const dest = mode === 'attack' ? HQ_POS[team === 0 ? 1 : 0] : RALLY_POS[team];
  const ids = world.entities.filter((e) => e.team === team && e.kind === 'unit').map((e) => e.id);
  orderUnits(world, ids, { mode, x: dest.x, z: dest.z });
}

/** 마지막 교전 후 quietFor초가 지나지 않았으면 교전 중 */
export function inCombat(world: World, quietFor = 4): boolean {
  return world.time - world.lastCombatAt < quietFor;
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

function findTarget(world: World, e: Entity): Entity | null {
  let best: Entity | null = null;
  let bestScore = Infinity;
  for (const o of world.entities) {
    if (o.dead || o.team === e.team) continue;
    const d = dist(e, o) - o.radius;
    if (d > AGGRO_RANGE && !(e.order.mode === 'attack' && o.kind === 'structure' && d < AGGRO_RANGE * 2)) continue;
    const score = d + (o.kind === 'structure' ? 6 : 0); // 유닛 우선 공격
    if (score < bestScore) { bestScore = score; best = o; }
  }
  return best;
}

function moveToward(e: Entity, tx: number, tz: number, dt: number): void {
  const dx = tx - e.x;
  const dz = tz - e.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return;
  const step = Math.min(d, e.speed * dt);
  e.x += (dx / d) * step;
  e.z += (dz / d) * step;
}

function clampToMap(e: Entity): void {
  e.x = Math.max(-MAP.halfX, Math.min(MAP.halfX, e.x));
  e.z = Math.max(-MAP.halfZ, Math.min(MAP.halfZ, e.z));
}

function separate(entities: Entity[]): void {
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i], b = entities[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const min = a.radius + b.radius;
      if (d < min) {
        const push = (min - d) / 2;
        const nx = dx / d, nz = dz / d;
        if (a.kind === 'unit') { a.x -= nx * push; a.z -= nz * push; }
        if (b.kind === 'unit') { b.x += nx * push; b.z += nz * push; }
      }
    }
  }
}

function applyTraits(world: World, e: Entity, dt: number): void {
  const trait = FACTIONS[e.factionId].trait;
  const sinceHit = world.time - e.lastHitAt;
  if (trait === 'regen') e.hp = Math.min(e.maxHp, e.hp + TRAIT_RATES.regen * dt);
  if (e.maxShield > 0 && sinceHit > SHIELD_DELAY) e.shield = Math.min(e.maxShield, e.shield + TRAIT_RATES.shield * dt);
  if (trait === 'repair' && e.kind === 'structure' && sinceHit > REPAIR_DELAY) {
    e.hp = Math.min(e.maxHp, e.hp + TRAIT_RATES.repair * dt);
  }
}

/** 공격자의 사거리 안에 target이 있는가 (반지름 포함) */
export function inReach(attacker: Entity, target: Entity): boolean {
  if (!attacker.attack) return false;
  return dist(attacker, target) <= attacker.attack.range + attacker.radius + target.radius;
}

function strike(world: World, e: Entity, target: Entity): CombatEvent {
  const atk = e.attack!;
  const r = applyDamage(target, atk.damage, atk.type);
  target.shield = r.shield;
  target.hp = r.hp;
  target.lastHitAt = world.time;
  e.cooldownLeft = atk.cooldown;
  world.lastCombatAt = world.time;
  world.lastCombatPos = { x: (e.x + target.x) / 2, z: (e.z + target.z) / 2 };
  return { type: 'shot', from: e.id, to: target.id, ranged: atk.range > 2 };
}

// ---------- 1인칭 빙의 조작 ----------

/** 빙의 유닛 이동: (dx, dz)는 월드 기준 방향, 길이 1 이하로 정규화 */
export function possessedMove(e: Entity, dx: number, dz: number, dt: number): void {
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return;
  const k = Math.min(1, len) / len;
  e.x += dx * k * e.speed * dt;
  e.z += dz * k * e.speed * dt;
  clampToMap(e);
}

export type FireResult =
  | { ok: true; event: CombatEvent }
  | { ok: false; reason: 'cooldown' | 'no_target' | 'out_of_range' };

/** 빙의 유닛 사격: 조준한 대상에게 즉시 공격 (쿨다운·사거리 적용) */
export function possessedFire(world: World, e: Entity, target: Entity | null): FireResult {
  if (!e.attack || e.cooldownLeft > 0) return { ok: false, reason: 'cooldown' };
  if (!target || target.dead || target.team === e.team) return { ok: false, reason: 'no_target' };
  if (!inReach(e, target)) return { ok: false, reason: 'out_of_range' };
  return { ok: true, event: strike(world, e, target) };
}

export function stepCombat(world: World, dt: number): CombatEvent[] {
  world.time += dt;
  const events: CombatEvent[] = [];
  const byId = new Map(world.entities.map((e) => [e.id, e]));

  for (const e of world.entities) {
    if (e.dead) continue;
    applyTraits(world, e, dt);
    if (e.kind !== 'unit' || !e.attack) continue;
    e.cooldownLeft = Math.max(0, e.cooldownLeft - dt);
    if (e.possessed) continue;

    let target: Entity | null = null;
    const forced = e.forcedTargetId != null ? byId.get(e.forcedTargetId) : undefined;
    if (forced && !forced.dead) {
      target = forced;
    } else {
      e.forcedTargetId = null;
      if (e.order.mode === 'move') {
        // 이동 명령: 적 무시, 도착하면 그 자리 방어
        moveToward(e, e.order.x, e.order.z, dt);
        if (Math.hypot(e.order.x - e.x, e.order.z - e.z) < 0.6) e.order.mode = 'hold';
      } else {
        target = (e.targetId != null ? byId.get(e.targetId) : undefined) ?? null;
        if (!target || target.dead || dist(e, target) - target.radius > AGGRO_RANGE * 1.5) {
          target = findTarget(world, e);
          e.targetId = target?.id ?? null;
        }
        if (!target) moveToward(e, e.order.x, e.order.z, dt);
      }
    }

    if (target) {
      if (!inReach(e, target)) moveToward(e, target.x, target.z, dt);
      else if (e.cooldownLeft === 0) events.push(strike(world, e, target));
    }
    clampToMap(e);
  }

  for (const e of world.entities) {
    if (!e.dead && e.hp <= 0) {
      e.dead = true;
      events.push({ type: 'death', id: e.id, team: e.team, kind: e.kind, supply: e.supply });
    }
  }
  separate(world.entities.filter((e) => !e.dead));
  world.entities = world.entities.filter((e) => !e.dead);
  world.events = events;
  return events;
}
