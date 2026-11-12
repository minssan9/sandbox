// 2D 운영 레이어: 자원 채취, 건설, 생산 큐, 인구수
import { FACTIONS } from '../data/factions.ts';
import type { BuildingType, Cost, FactionId, Result, UnitType } from '../types.ts';

export const MAX_SUPPLY = 100;
export const GAS_WORKERS_PER_BUILDING = 3;
export const QUEUE_LIMIT = 5;
/** 플레이어당 전투 유닛 상한 (일꾼 제외, 생산 대기 포함) */
export const UNIT_CAP = 100;

export interface ProductionJob { unitType: UnitType; remaining: number }

export interface Building {
  id: number;
  type: BuildingType;
  done: boolean;
  progress: number;
  hp: number;
  shield: number;
  queue: ProductionJob[];
}

export interface Economy {
  factionId: FactionId;
  ore: number;
  gas: number;
  workersOre: number;
  workersGas: number;
  supplyUsed: number;
  /** 살아있는 + 생산 대기 중인 전투 유닛 수 */
  army: number;
  buildings: Building[];
}

let nextId = 1;

export function createEconomy(factionId: FactionId, { ore = 50, workers = 4 } = {}): Economy {
  const f = FACTIONS[factionId];
  const eco: Economy = {
    factionId,
    ore,
    gas: 0,
    workersOre: workers,
    workersGas: 0,
    supplyUsed: workers * f.units.worker.supply,
    army: 0,
    buildings: [],
  };
  eco.buildings.push(makeBuilding(eco, 'hq', true));
  return eco;
}

function makeBuilding(eco: Economy, type: BuildingType, done = false): Building {
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

export function supplyCap(eco: Economy): number {
  const defs = FACTIONS[eco.factionId].buildings;
  const cap = eco.buildings
    .filter((b) => b.done)
    .reduce((sum, b) => sum + (defs[b.type].supply ?? 0), 0);
  return Math.min(MAX_SUPPLY, cap);
}

export function gasCapacity(eco: Economy): number {
  return eco.buildings.filter((b) => b.type === 'gas' && b.done).length * GAS_WORKERS_PER_BUILDING;
}

export function canAfford(eco: Economy, cost: Cost): boolean {
  return eco.ore >= cost.ore && eco.gas >= cost.gas;
}

function pay(eco: Economy, cost: Cost): void {
  eco.ore -= cost.ore;
  eco.gas -= cost.gas;
}

export function queueBuilding(eco: Economy, type: BuildingType): Result & { building?: Building } {
  const def = FACTIONS[eco.factionId].buildings[type];
  if (!canAfford(eco, def.cost)) return { ok: false, reason: '자원 부족' };
  pay(eco, def.cost);
  const building = makeBuilding(eco, type);
  eco.buildings.push(building);
  return { ok: true, building };
}

export function queueUnit(eco: Economy, buildingId: number, unitType: UnitType): Result {
  const faction = FACTIONS[eco.factionId];
  const b = eco.buildings.find((x) => x.id === buildingId);
  if (!b || !b.done) return { ok: false, reason: '건물이 준비되지 않음' };
  if (!faction.buildings[b.type].produces?.includes(unitType)) return { ok: false, reason: '생산 불가' };
  if (b.queue.length >= QUEUE_LIMIT) return { ok: false, reason: '큐가 가득 참' };
  if (unitType !== 'worker' && eco.army >= UNIT_CAP) return { ok: false, reason: `유닛 한도(${UNIT_CAP}) 도달` };
  const def = faction.units[unitType];
  if (eco.supplyUsed + def.supply > supplyCap(eco)) return { ok: false, reason: '인구수 부족' };
  if (!canAfford(eco, def.cost)) return { ok: false, reason: '자원 부족' };
  pay(eco, def.cost);
  eco.supplyUsed += def.supply; // 큐에 넣는 순간 예약
  if (unitType !== 'worker') eco.army++;
  b.queue.push({ unitType, remaining: def.buildTime });
  return { ok: true };
}

/** 일꾼 배치 변경: 'gas'면 광물→가스, 'ore'면 가스→광물 */
export function moveWorker(eco: Economy, target: 'ore' | 'gas'): boolean {
  if (target === 'gas') {
    if (eco.workersOre <= 0 || eco.workersGas >= gasCapacity(eco)) return false;
    eco.workersOre--; eco.workersGas++;
    return true;
  }
  if (eco.workersGas <= 0) return false;
  eco.workersGas--; eco.workersOre++;
  return true;
}

/** 전투 유닛 사망 시 인구수와 유닛 수 반환 */
export function releaseUnit(eco: Economy, supply: number): void {
  eco.supplyUsed = Math.max(0, eco.supplyUsed - supply);
  eco.army = Math.max(0, eco.army - 1);
}

/** 시간 진행. 생산 완료된 전투 유닛 타입 배열 반환 (일꾼은 내부 처리) */
export function tickEconomy(eco: Economy, dt: number): UnitType[] {
  const faction = FACTIONS[eco.factionId];
  const spawned: UnitType[] = [];

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
