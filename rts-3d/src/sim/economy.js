// 2D 운영 레이어: 자원 채취, 건설, 생산 큐, 인구수
import { FACTIONS } from '../data/factions.js';

export const MAX_SUPPLY = 100;
export const GAS_WORKERS_PER_BUILDING = 3;
export const QUEUE_LIMIT = 5;

let nextId = 1;

export function createEconomy(factionId, { ore = 50, workers = 4 } = {}) {
  const f = FACTIONS[factionId];
  const eco = {
    factionId,
    ore,
    gas: 0,
    workersOre: workers,
    workersGas: 0,
    supplyUsed: workers * f.units.worker.supply,
    buildings: [],
    log: [],
  };
  eco.buildings.push(makeBuilding(eco, 'hq', true));
  return eco;
}

function makeBuilding(eco, type, done = false) {
  const def = FACTIONS[eco.factionId].buildings[type];
  return {
    id: nextId++,
    type,
    done,
    progress: done ? def.buildTime : 0,
    hp: def.hp,
    shield: def.shield ?? 0,
    queue: [],
  };
}

export function supplyCap(eco) {
  const defs = FACTIONS[eco.factionId].buildings;
  const cap = eco.buildings
    .filter((b) => b.done)
    .reduce((sum, b) => sum + (defs[b.type].supply ?? 0), 0);
  return Math.min(MAX_SUPPLY, cap);
}

export function gasCapacity(eco) {
  return eco.buildings.filter((b) => b.type === 'gas' && b.done).length * GAS_WORKERS_PER_BUILDING;
}

export function canAfford(eco, cost) {
  return eco.ore >= cost.ore && eco.gas >= cost.gas;
}

function pay(eco, cost) {
  eco.ore -= cost.ore;
  eco.gas -= cost.gas;
}

export function queueBuilding(eco, type) {
  const def = FACTIONS[eco.factionId].buildings[type];
  if (!def) return { ok: false, reason: '알 수 없는 건물' };
  if (!canAfford(eco, def.cost)) return { ok: false, reason: '자원 부족' };
  pay(eco, def.cost);
  const b = makeBuilding(eco, type);
  eco.buildings.push(b);
  return { ok: true, building: b };
}

export function queueUnit(eco, buildingId, unitType) {
  const faction = FACTIONS[eco.factionId];
  const b = eco.buildings.find((x) => x.id === buildingId);
  if (!b || !b.done) return { ok: false, reason: '건물이 준비되지 않음' };
  if (!faction.buildings[b.type].produces?.includes(unitType)) return { ok: false, reason: '생산 불가' };
  if (b.queue.length >= QUEUE_LIMIT) return { ok: false, reason: '큐가 가득 참' };
  const def = faction.units[unitType];
  if (eco.supplyUsed + def.supply > supplyCap(eco)) return { ok: false, reason: '인구수 부족' };
  if (!canAfford(eco, def.cost)) return { ok: false, reason: '자원 부족' };
  pay(eco, def.cost);
  eco.supplyUsed += def.supply; // 큐에 넣는 순간 예약
  b.queue.push({ unitType, remaining: def.buildTime });
  return { ok: true };
}

/** 일꾼 배치 변경: target 'gas'면 광물→가스, 'ore'면 가스→광물 */
export function moveWorker(eco, target) {
  if (target === 'gas') {
    if (eco.workersOre <= 0 || eco.workersGas >= gasCapacity(eco)) return false;
    eco.workersOre--; eco.workersGas++;
    return true;
  }
  if (eco.workersGas <= 0) return false;
  eco.workersGas--; eco.workersOre++;
  return true;
}

export function releaseSupply(eco, amount) {
  eco.supplyUsed = Math.max(0, eco.supplyUsed - amount);
}

/**
 * 시간 진행. 생산 완료된 전투 유닛 타입 배열을 반환(일꾼은 내부에서 처리).
 */
export function tickEconomy(eco, dt) {
  const faction = FACTIONS[eco.factionId];
  const spawned = [];

  eco.ore += eco.workersOre * faction.workerIncome.ore * dt;
  eco.gas += Math.min(eco.workersGas, gasCapacity(eco)) * faction.workerIncome.gas * dt;

  for (const b of eco.buildings) {
    if (!b.done) {
      b.progress += dt;
      if (b.progress >= faction.buildings[b.type].buildTime) b.done = true;
      continue;
    }
    const job = b.queue[0];
    if (!job) continue;
    job.remaining -= dt;
    if (job.remaining <= 0) {
      b.queue.shift();
      if (job.unitType === 'worker') eco.workersOre++;
      else spawned.push(job.unitType);
    }
  }
  return spawned;
}
