import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage } from '../src/data/rules.js';
import { createEconomy, tickEconomy, queueBuilding, queueUnit, supplyCap, moveWorker } from '../src/sim/economy.js';
import { createWorld, spawnUnit, spawnStructure, orderTeam, orderUnits, stepCombat, inCombat } from '../src/sim/combat.js';
import { createAI, tickAI } from '../src/sim/ai.js';

test('실드가 먼저 소모되고 남은 피해에 타입 배율·방어력 적용', () => {
  const t = { hp: 100, shield: 10, armor: 1, size: 'large' };
  const r = applyDamage(t, 30, 'plasma'); // 10 실드, 20*0.25-1 = 4
  assert.equal(r.shield, 0);
  assert.equal(r.hp, 96);
});

test('최소 피해 보장', () => {
  const r = applyDamage({ hp: 10, shield: 0, armor: 5, size: 'small' }, 2, 'kinetic');
  assert.equal(r.hp, 9.5);
});

test('경제: 채취·건설·생산 흐름', () => {
  const eco = createEconomy('coalition', { ore: 1000 });
  assert.equal(supplyCap(eco), 10);
  const { building } = queueBuilding(eco, 'factory');
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
  const { building } = queueBuilding(eco, 'factory');
  tickEconomy(eco, 40);
  queueUnit(eco, building.id, 'infantry'); queueUnit(eco, building.id, 'infantry'); queueUnit(eco, building.id, 'infantry');
  assert.equal(queueUnit(eco, building.id, 'infantry').reason, '인구수 부족');
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
  Object.assign(me, { x: 0, z: 0 });
  Object.assign(foe, { x: 2, z: 0 });
  orderUnits(w, [foe.id], { mode: 'move', x: 2, z: 0 }); // 적은 제자리
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
  Object.assign(me, { x: 0, z: 0 });
  Object.assign(near, { x: 3, z: 0, speed: 0 });
  Object.assign(far, { x: 0, z: 12, speed: 0 });
  near.attack = far.attack = { damage: 0, type: 'kinetic', cooldown: 99, range: 0 };
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
  Object.assign(a, { x: 0, z: 0 }); Object.assign(b, { x: 3, z: 0 });
  stepCombat(w, 0.1);
  assert.equal(inCombat(w), true);
  a.dead = true; w.entities = w.entities.filter((e) => !e.dead);
  for (let i = 0; i < 50; i++) stepCombat(w, 0.1);
  assert.equal(inCombat(w), false);
});
