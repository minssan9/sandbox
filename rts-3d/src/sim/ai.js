// 적 AI: 같은 경제 규칙으로 운영하고 주기적으로 공격 웨이브를 보냄
import { FACTIONS } from '../data/factions.js';
import { queueBuilding, queueUnit, moveWorker, supplyCap, gasCapacity, canAfford } from './economy.js';

export function createAI({ firstWave = 150, waveInterval = 90 } = {}) {
  return { thinkTimer: 0, nextWaveAt: firstWave, waveInterval, wave: 0 };
}

const count = (eco, type) => eco.buildings.filter((b) => b.type === type).length;

function think(eco) {
  const f = FACTIONS[eco.factionId];
  const cap = supplyCap(eco);
  const pendingSupply = eco.buildings.some((b) => b.type === 'supply' && !b.done);

  if (cap - eco.supplyUsed <= 3 && !pendingSupply && cap < 100) {
    queueBuilding(eco, 'supply');
    return;
  }
  if (eco.workersGas < gasCapacity(eco)) moveWorker(eco, 'gas');

  const hq = eco.buildings.find((b) => b.type === 'hq');
  const workers = eco.workersOre + eco.workersGas;
  if (workers < 14 && hq.queue.length < 1) queueUnit(eco, hq.id, 'worker');

  if (count(eco, 'factory') < 1) { queueBuilding(eco, 'factory'); return; }
  if (count(eco, 'gas') < 1 && workers >= 8) { queueBuilding(eco, 'gas'); return; }
  if (count(eco, 'factory') < 2 && eco.ore > 250) { queueBuilding(eco, 'factory'); return; }

  for (const b of eco.buildings) {
    if (b.type !== 'factory' || !b.done || b.queue.length >= 2) continue;
    const pick = eco.gas >= f.units.ranged.cost.gas && Math.random() < 0.45 ? 'ranged' : 'infantry';
    if (canAfford(eco, f.units[pick].cost)) queueUnit(eco, b.id, pick);
  }
}

/** @returns {'attack'|null} 공격 명령 여부 */
export function tickAI(ai, eco, elapsed, dt) {
  ai.thinkTimer -= dt;
  if (ai.thinkTimer <= 0) {
    ai.thinkTimer = 1;
    think(eco);
  }
  if (elapsed >= ai.nextWaveAt) {
    ai.wave++;
    ai.nextWaveAt += ai.waveInterval;
    return 'attack';
  }
  return null;
}
