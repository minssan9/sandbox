// 3D 실시간 전투 시뮬레이션 (렌더링과 분리된 순수 로직)
import { FACTIONS, TRAIT_RATES, SHIELD_DELAY } from '../data/factions.js';
import { applyDamage } from '../data/rules.js';

export const MAP = { halfX: 40, halfZ: 16 };
export const HQ_POS = [{ x: -34, z: 0 }, { x: 34, z: 0 }];
export const RALLY_POS = [{ x: -26, z: 0 }, { x: 26, z: 0 }];
export const AGGRO_RANGE = 8;
const RADIUS = { small: 0.4, medium: 0.6, large: 0.8, structure: 2.5 };
const REPAIR_DELAY = 10;

let nextId = 1;

export function createWorld() {
  // lastCombatAt/lastCombatPos: 교전 감지용 (3D 자동 전환 트리거)
  return { time: 0, entities: [], events: [], lastCombatAt: -999, lastCombatPos: { x: 0, z: 0 } };
}

export function spawnStructure(world, team, factionId, type) {
  const def = FACTIONS[factionId].buildings[type];
  const pos = HQ_POS[team];
  const e = {
    id: nextId++, team, factionId, kind: 'structure', type, name: def.name,
    x: pos.x, z: pos.z, size: 'large', radius: RADIUS.structure,
    hp: def.hp, maxHp: def.hp, shield: def.shield ?? 0, maxShield: def.shield ?? 0,
    armor: def.armor, speed: 0, attack: null, cooldownLeft: 0, lastHitAt: -999, dead: false,
  };
  world.entities.push(e);
  return e;
}

export function spawnUnit(world, team, factionId, unitType) {
  const def = FACTIONS[factionId].units[unitType];
  const rally = RALLY_POS[team];
  const e = {
    id: nextId++, team, factionId, kind: 'unit', type: unitType, name: def.name,
    x: rally.x + (Math.random() - 0.5) * 3, z: rally.z + (Math.random() - 0.5) * 6,
    size: def.size, radius: RADIUS[def.size],
    hp: def.hp, maxHp: def.hp, shield: def.shield, maxShield: def.shield,
    armor: def.armor, speed: def.speed, attack: def.attack, supply: def.supply,
    cooldownLeft: 0, lastHitAt: -999, dead: false, targetId: null, forcedTargetId: null,
    order: { mode: 'hold', x: rally.x, z: rally.z },
  };
  world.entities.push(e);
  return e;
}

/**
 * 개별 유닛 명령
 * - move: 적을 무시하고 이동, 도착 후 그 자리 방어(hold)
 * - attack: 공격 이동 (가는 길의 적과 교전)
 * - hold: 지점 방어 (사거리 내 적만 교전 후 복귀)
 * - target: 특정 적 집중 공격 (targetId 필요)
 */
export function orderUnits(world, ids, order) {
  const set = new Set(ids);
  for (const e of world.entities) {
    if (!set.has(e.id) || e.kind !== 'unit' || e.dead) continue;
    e.targetId = null;
    if (order.mode === 'target') {
      e.forcedTargetId = order.targetId;
      continue;
    }
    e.forcedTargetId = null;
    e.order = { mode: order.mode, x: order.x ?? e.x, z: order.z ?? e.z };
  }
}

/** 팀 전체 명령: 'attack'(적 본진으로 진격) | 'hold'(집결지 방어) */
export function orderTeam(world, team, mode) {
  const dest = mode === 'attack' ? HQ_POS[1 - team] : RALLY_POS[team];
  const ids = world.entities.filter((e) => e.team === team && e.kind === 'unit').map((e) => e.id);
  orderUnits(world, ids, { mode, x: dest.x, z: dest.z });
}

/** 마지막 교전 후 quietFor초가 지나지 않았으면 교전 중 */
export function inCombat(world, quietFor = 4) {
  return world.time - world.lastCombatAt < quietFor;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function findTarget(world, e) {
  let best = null;
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

function moveToward(e, tx, tz, dt) {
  const dx = tx - e.x;
  const dz = tz - e.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return;
  const step = Math.min(d, e.speed * dt);
  e.x += (dx / d) * step;
  e.z += (dz / d) * step;
}

function separate(units) {
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j];
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

function applyTraits(world, e, dt) {
  const trait = FACTIONS[e.factionId].trait;
  const sinceHit = world.time - e.lastHitAt;
  if (trait === 'regen') e.hp = Math.min(e.maxHp, e.hp + TRAIT_RATES.regen * dt);
  if (e.maxShield > 0 && sinceHit > SHIELD_DELAY) e.shield = Math.min(e.maxShield, e.shield + TRAIT_RATES.shield * dt);
  if (trait === 'repair' && e.kind === 'structure' && sinceHit > REPAIR_DELAY) {
    e.hp = Math.min(e.maxHp, e.hp + TRAIT_RATES.repair * dt);
  }
}

export function stepCombat(world, dt) {
  world.time += dt;
  world.events.length = 0;
  const byId = new Map(world.entities.map((e) => [e.id, e]));

  for (const e of world.entities) {
    if (e.dead) continue;
    applyTraits(world, e, dt);
    if (e.kind !== 'unit') continue;

    e.cooldownLeft = Math.max(0, e.cooldownLeft - dt);
    let target = null;

    const forced = e.forcedTargetId != null ? byId.get(e.forcedTargetId) : null;
    if (forced && !forced.dead) {
      target = forced;
    } else {
      e.forcedTargetId = null;
      if (e.order.mode === 'move') {
        // 이동 명령: 적 무시, 도착하면 그 자리 방어
        moveToward(e, e.order.x, e.order.z, dt);
        if (Math.hypot(e.order.x - e.x, e.order.z - e.z) < 0.6) e.order.mode = 'hold';
      } else {
        target = byId.get(e.targetId);
        if (!target || target.dead || dist(e, target) - target.radius > AGGRO_RANGE * 1.5) {
          target = findTarget(world, e);
          e.targetId = target?.id ?? null;
        }
        if (!target) moveToward(e, e.order.x, e.order.z, dt);
      }
    }

    if (target) {
      const reach = e.attack.range + e.radius + target.radius;
      if (dist(e, target) > reach) {
        moveToward(e, target.x, target.z, dt);
      } else if (e.cooldownLeft === 0) {
        const r = applyDamage(target, e.attack.damage, e.attack.type);
        target.shield = r.shield;
        target.hp = r.hp;
        target.lastHitAt = world.time;
        e.cooldownLeft = e.attack.cooldown;
        world.lastCombatAt = world.time;
        world.lastCombatPos = { x: (e.x + target.x) / 2, z: (e.z + target.z) / 2 };
        world.events.push({ type: 'shot', from: e.id, to: target.id, ranged: e.attack.range > 2 });
      }
    }
    e.x = Math.max(-MAP.halfX, Math.min(MAP.halfX, e.x));
    e.z = Math.max(-MAP.halfZ, Math.min(MAP.halfZ, e.z));
  }

  for (const e of world.entities) {
    if (!e.dead && e.hp <= 0) {
      e.dead = true;
      world.events.push({ type: 'death', id: e.id, team: e.team, kind: e.kind, supply: e.supply ?? 0 });
    }
  }
  separate(world.entities.filter((e) => !e.dead));
  world.entities = world.entities.filter((e) => !e.dead);
  return world.events;
}
