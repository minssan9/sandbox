import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEconomy, tickEconomy, queueBuilding, queueUnit, supplyCap, moveWorker, releaseUnit, UNIT_CAP } from '../src/sim/economy.ts';
import {
  initCombatCore, createWorld, spawnUnit, spawnStructure, orderTeam, orderUnits, stepCombat, inCombat,
  possessedMove, possessedFire, setPossessed, debugSet, debugSetAttack,
} from '../src/sim/combat.ts';
import { createAI, tickAI } from '../src/sim/ai.ts';

// 전투 테스트는 실제 Rust WASM 바이너리를 불러와 실행 (npm run build:wasm 결과물)
before(async () => {
  await initCombatCore(await readFile(new URL('../src/sim/wasm/combat_core.wasm', import.meta.url)));
});

test('피해 계산(WASM): 플라즈마 → 대형·방어력 1 = 18×0.25−1', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'ascendant', 'ranged'); // Arc Sentinel: 18 plasma
  const foe = spawnUnit(w, 1, 'coalition', 'ranged'); // Lancer: large, armor 1, hp 125
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, foe, { x: 3, z: 0 });
  setPossessed(w, me.id, true);
  assert.ok(possessedFire(w, me, foe).ok);
  assert.equal(foe.hp, 121.5);
});

test('피해 계산(WASM): 실드가 먼저 소모', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'coalition', 'ranged'); // Lancer: 20 explosive
  const foe = spawnUnit(w, 1, 'ascendant', 'infantry'); // Warden: shield 60
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, foe, { x: 3, z: 0 });
  setPossessed(w, me.id, true);
  possessedFire(w, me, foe);
  assert.equal(foe.shield, 40);
  assert.equal(foe.hp, foe.maxHp);
});

test('경제: 채취·건설·생산 흐름', () => {
  const eco = createEconomy('coalition', { ore: 1000 });
  assert.equal(supplyCap(eco), 10);
  const building = queueBuilding(eco, 'factory').building!;
  assert.equal(queueUnit(eco, building.id, 'infantry').ok, false); // 건설 중
  tickEconomy(eco, 35);
  assert.ok(building.done);
  assert.ok(queueUnit(eco, building.id, 'infantry').ok);
  const spawned = tickEconomy(eco, 15);
  assert.deepEqual(spawned, ['infantry']);
  assert.equal(eco.supplyUsed, 5);
});

test('인구수 초과 시 생산 거부', () => {
  const eco = createEconomy('ascendant', { ore: 5000 });
  const building = queueBuilding(eco, 'factory').building!;
  tickEconomy(eco, 40);
  queueUnit(eco, building.id, 'infantry'); queueUnit(eco, building.id, 'infantry'); queueUnit(eco, building.id, 'infantry');
  assert.deepEqual(queueUnit(eco, building.id, 'infantry'), { ok: false, reason: '인구수 부족' });
});

test('전투 유닛 100기 상한 (일꾼 제외, 사망 시 반환)', () => {
  const eco = createEconomy('swarm', { ore: 1e6 });
  for (let i = 0; i < 12; i++) queueBuilding(eco, 'supply');
  for (let i = 0; i < 25; i++) queueBuilding(eco, 'factory');
  tickEconomy(eco, 40);
  eco.supplyUsed = 0; // 인구수 제약을 빼고 유닛 상한만 검증
  const factories = eco.buildings.filter((b) => b.type === 'factory');
  let queued = 0;
  for (const f of factories) for (let k = 0; k < 5; k++) if (queueUnit(eco, f.id, 'infantry').ok) queued++;
  assert.equal(queued, UNIT_CAP);
  assert.equal(eco.army, UNIT_CAP);
  const extra = factories.find((f) => f.queue.length < 5)!;
  assert.deepEqual(queueUnit(eco, extra.id, 'infantry'), { ok: false, reason: '유닛 한도(100) 도달' });
  const hq = eco.buildings.find((b) => b.type === 'hq')!;
  assert.ok(queueUnit(eco, hq.id, 'worker').ok, '일꾼은 상한에 포함되지 않음');
  releaseUnit(eco, 0.5);
  assert.ok(queueUnit(eco, extra.id, 'infantry').ok, '사망하면 다시 생산 가능');
});

test('가스 일꾼은 가스 건물 정원까지만', () => {
  const eco = createEconomy('swarm', { ore: 500 });
  assert.equal(moveWorker(eco, 'gas'), false);
  queueBuilding(eco, 'gas');
  tickEconomy(eco, 20);
  for (let i = 0; i < 3; i++) assert.ok(moveWorker(eco, 'gas'));
  assert.equal(moveWorker(eco, 'gas'), false);
});

test('전투: 공격 명령 유닛이 적 본진을 파괴', () => {
  const w = createWorld();
  spawnStructure(w, 1, 'swarm', 'hq');
  for (let i = 0; i < 12; i++) spawnUnit(w, 0, 'coalition', 'ranged');
  orderTeam(w, 0, 'attack');
  let destroyed = false;
  for (let t = 0; t < 600 && !destroyed; t++) {
    destroyed = stepCombat(w, 0.1).some((e) => e.type === 'death' && e.kind === 'structure');
  }
  assert.ok(destroyed);
  assert.equal(w.entities.filter((e) => e.kind === 'structure').length, 0);
});

test('AI가 일정 시간 후 공격 웨이브를 발동하고 병력을 생산', () => {
  const eco = createEconomy('swarm');
  const ai = createAI({ firstWave: 150 });
  let attacked = false;
  let units = 0;
  for (let t = 0; t < 1600; t++) {
    units += tickEconomy(eco, 0.1).length;
    if (tickAI(ai, eco, t * 0.1, 0.1) === 'attack') attacked = true;
  }
  assert.ok(attacked);
  assert.ok(units > 0, `units=${units}`);
});

test('이동 명령은 적을 무시하고 도착 후 방어로 전환', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'coalition', 'infantry');
  const foe = spawnUnit(w, 1, 'swarm', 'infantry');
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, foe, { x: 2, z: 0, speed: 0 });
  orderUnits(w, [foe.id], { mode: 'move', x: 2, z: 0 });
  orderUnits(w, [me.id], { mode: 'move', x: 0, z: 10 });
  for (let i = 0; i < 60; i++) stepCombat(w, 0.1);
  assert.ok(Math.abs(me.z - 10) < 0.7, `z=${me.z}`);
  assert.equal(me.order.mode, 'hold');
});

test('집중 공격 명령은 지정한 적만 노림', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'coalition', 'ranged');
  const near = spawnUnit(w, 1, 'swarm', 'infantry');
  const far = spawnUnit(w, 1, 'swarm', 'ranged');
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, near, { x: 3, z: 0, speed: 0 });
  debugSet(w, far, { x: 0, z: 12, speed: 0 });
  debugSetAttack(w, near, null);
  debugSetAttack(w, far, null);
  orderUnits(w, [me.id], { mode: 'target', targetId: far.id });
  for (let i = 0; i < 30; i++) stepCombat(w, 0.1);
  assert.equal(near.hp, near.maxHp);
  assert.ok(far.hp < far.maxHp);
});

test('교전 감지: 사격 후 inCombat, 조용해지면 해제', () => {
  const w = createWorld();
  assert.equal(inCombat(w), false);
  const a = spawnUnit(w, 0, 'coalition', 'infantry');
  const b = spawnUnit(w, 1, 'swarm', 'ranged');
  debugSet(w, a, { x: 0, z: 0 });
  debugSet(w, b, { x: 3, z: 0 });
  stepCombat(w, 0.1);
  assert.equal(inCombat(w), true);
  debugSet(w, a, { hp: 0 });
  for (let i = 0; i < 50; i++) stepCombat(w, 0.1);
  assert.equal(inCombat(w), false);
  assert.equal(w.byId.has(a.id), false, '죽은 유닛은 JS 쪽에서도 제거');
});

test('1인칭 빙의 유닛은 AI 행동 없이 입력대로만 이동', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'coalition', 'infantry');
  const foe = spawnUnit(w, 1, 'swarm', 'infantry');
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, foe, { x: 3, z: 0, speed: 0 });
  debugSetAttack(w, foe, null);
  setPossessed(w, me.id, true);
  for (let i = 0; i < 10; i++) stepCombat(w, 0.1);
  assert.equal(foe.hp, foe.maxHp, '빙의 유닛은 자동 사격하지 않음');
  possessedMove(w, me, 0, 1, 1); // +z 방향 1초
  assert.ok(Math.abs(me.z - me.speed) < 1e-9);
  possessedMove(w, me, 10, 0, 1); // 입력 크기와 무관하게 최대 속도
  assert.ok(Math.abs(me.x - me.speed) < 1e-9);
});

test('1인칭 사격: 사거리·쿨다운·아군 판정', () => {
  const w = createWorld();
  const me = spawnUnit(w, 0, 'coalition', 'infantry');
  const ally = spawnUnit(w, 0, 'coalition', 'infantry');
  const foe = spawnUnit(w, 1, 'swarm', 'ranged');
  debugSet(w, me, { x: 0, z: 0 });
  debugSet(w, ally, { x: 0, z: 5 });
  debugSet(w, foe, { x: 20, z: 0 });
  setPossessed(w, me.id, true);
  assert.deepEqual(possessedFire(w, me, foe), { ok: false, reason: 'out_of_range' });
  assert.deepEqual(possessedFire(w, me, ally), { ok: false, reason: 'no_target' });
  assert.deepEqual(possessedFire(w, me, null), { ok: false, reason: 'no_target' });
  debugSet(w, foe, { x: 3 });
  const r = possessedFire(w, me, foe);
  assert.ok(r.ok);
  assert.ok(foe.hp < foe.maxHp);
  assert.ok(inCombat(w));
  assert.deepEqual(possessedFire(w, me, foe), { ok: false, reason: 'cooldown' });
  stepCombat(w, me.attack!.cooldown + 0.01);
  assert.ok(possessedFire(w, me, foe).ok);
});
