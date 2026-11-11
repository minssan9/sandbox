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
  return { time: 0, entities: [], events: [] };
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
    cooldownLeft: 0, lastHitAt: -999, dead: false, targetId: null,
    order: { mode: 'hold', x: rally.x, z: rally.z },
  };
  world.entities.push(e);
  return e;
}

/** 팀 전체 명령: 'attack'(적 본진으로 진격) | 'hold'(집결지 방어) */
export function orderTeam(world, team, mode) {
  const dest = mode === 'attack' ? HQ_POS[1 - team] : RALLY_POS[team];
  for (const e of world.entities) {
    if (e.team === team && e.kind === 'unit' && !e.dead) e.order = { mode, x: dest.x, z: dest.z };
  }
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
    let target = byId.get(e.targetId);
    if (!target || target.dead || dist(e, target) - target.radius > AGGRO_RANGE * 1.5) {
      target = findTarget(world, e);
      e.targetId = target?.id ?? null;
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
        world.events.push({ type: 'shot', from: e.id, to: target.id, ranged: e.attack.range > 2 });
      }
    } else {
      moveToward(e, e.order.x, e.order.z, dt);
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
