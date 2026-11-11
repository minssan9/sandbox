import './style.css';
import { FACTIONS, FACTION_IDS } from './data/factions.ts';
import { createEconomy, tickEconomy, queueBuilding, queueUnit, moveWorker, releaseSupply, supplyCap, canAfford } from './sim/economy.ts';
import {
  initCombatCore, createWorld, destroyWorld, spawnStructure, spawnUnit, orderTeam, orderUnits, stepCombat, inCombat,
  possessedMove, possessedFire, setPossessed, HQ_POS, RALLY_POS,
} from './sim/combat.ts';
import combatWasmUrl from './sim/wasm/combat_core.wasm?url';
import type { CombatEvent, Entity } from './sim/combat.ts';
import { createAI, tickAI } from './sim/ai.ts';
import { createBaseView } from './view/base2d.ts';
import { createFieldView } from './view/field2d.ts';
import { createBattleView } from './view/battle3d.ts';
import { iconCanvas } from './view/icons.ts';
import type { FactionId, Result, UnitType } from './types.ts';

const app = document.getElementById('app')!;
const AUTO_RETURN_QUIET = 6; // 교전 종료 후 이 시간(초) 동안 조작이 없으면 2D로 자동 복귀
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function showFactionSelect(): void {
  if (document.pointerLockElement) document.exitPointerLock();
  app.innerHTML = `
    <div class="select">
      <h1>Three Fronts</h1>
      <p>2D로 운영하고, 교전이 벌어지면 1인칭으로 뛰어들어 싸우세요.</p>
      <div class="cards">
        ${FACTION_IDS.map((id) => `
          <button class="card" data-faction="${id}">
            <span class="icon" data-icon="${id}"></span>
            <b>${FACTIONS[id].name}</b>
            <small>${FACTIONS[id].desc}</small>
          </button>`).join('')}
      </div>
    </div>`;
  app.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) =>
    el.appendChild(iconCanvas(el.dataset.icon as FactionId, 'hq', 0, 96)));
  app.querySelectorAll<HTMLElement>('[data-faction]').forEach((btn) =>
    btn.addEventListener('click', () => startGame(btn.dataset.faction as FactionId)));
}

function startGame(playerFaction: FactionId): void {
  const others = FACTION_IDS.filter((f) => f !== playerFaction);
  const enemyFaction = others[Math.floor(Math.random() * others.length)];
  const pf = FACTIONS[playerFaction];

  app.innerHTML = `
    <div class="game mode-ops">
      <aside class="ops"></aside>
      <section class="field"></section>
      <main class="battle">
        <div class="hud">
          <span data-h="res"></span>
          <span data-h="time">0:00</span>
          <span data-h="wave"></span>
          <span class="badge" data-h="combat">평온</span>
          <span class="spacer"></span>
          <button data-h="speed">1×</button>
          <button class="primary" data-h="back">2D 운영 <small>Tab</small></button>
        </div>
        <div class="banner hidden" data-h="banner"></div>
        <div class="dock">
          <div class="group">
            <span class="label" data-h="selcount">선택 0</span>
            <button class="primary" data-cmd="possess">1인칭 빙의 <small>V</small></button>
            <button data-cmd="all">전체 선택 <small>Ctrl+A</small></button>
            <button data-cmd="attack">공격 진격</button>
            <button data-cmd="hold">정지 <small>S</small></button>
            <button data-cmd="retreat">후퇴</button>
            <button data-cmd="overview">전장 전체</button>
          </div>
          <div class="group" data-h="quick"></div>
          <p class="keys">좌클릭·드래그 선택 · 우클릭 이동/공격 · Shift+우클릭 / A 공격 이동 · 1~9 유닛 빙의 · 휠 줌 · 가운데 드래그 회전 · 방향키 이동</p>
        </div>
        <div class="overlay hidden"></div>
      </main>
    </div>`;

  const game = app.querySelector<HTMLElement>('.game')!;
  const hud = (k: string) => app.querySelector<HTMLElement>(`[data-h="${k}"]`)!;

  const eco = createEconomy(playerFaction);
  const enemyEco = createEconomy(enemyFaction);
  const ai = createAI();
  const world = createWorld();
  spawnStructure(world, 0, playerFaction, 'hq');
  spawnStructure(world, 1, enemyFaction, 'hq');

  let playerOrder: 'attack' | 'hold' = 'hold';
  let speed = 1;
  let elapsed = 0;
  let over = false;
  let mode: 'ops' | 'battle' = 'ops';
  let autoEntered = false;
  let lastCommandAt = -999;
  let wasFighting = false;
  let autoSwitch = true;
  let quietHinted = false;

  const byId = (id: number | null) => (id == null ? undefined : world.entities.find((e) => e.id === id));
  const myUnits = () => world.entities.filter((e) => e.team === 0 && e.kind === 'unit');

  // ---------- 2D 운영 ----------
  const base = createBaseView(app.querySelector<HTMLElement>('.ops')!, eco, {
    build: (type) => queueBuilding(eco, type),
    train: (id, type) => queueUnit(eco, id, type),
    moveWorker: (target) => moveWorker(eco, target),
    order: (m) => { playerOrder = m; orderTeam(world, 0, m); },
  });
  const field = createFieldView(app.querySelector<HTMLElement>('.field')!, {
    onOpen3D: (pt) => enter3D({ pt, auto: false }),
  });
  app.querySelector('.field-head')!.insertAdjacentHTML('beforeend',
    '<label class="toggle"><input type="checkbox" checked data-h="auto"> 교전 시 자동 1인칭 전환</label>');
  hud('auto').addEventListener('change', (ev) => { autoSwitch = (ev.target as HTMLInputElement).checked; });

  // ---------- 3D 전투 ----------
  const battle = createBattleView(app.querySelector<HTMLElement>('.battle')!, {
    playerTeam: 0,
    onCommand: (cmd) => {
      orderUnits(world, cmd.ids, cmd);
      lastCommandAt = elapsed;
    },
    onSelect: (ids) => { hud('selcount').textContent = `선택 ${ids.length}`; },
    onPossess: (prevId, nextId) => {
      const prev = byId(prevId);
      if (prev) {
        setPossessed(world, prev.id, false);
        orderUnits(world, [prev.id], { mode: 'hold' }); // 빙의 해제 후 그 자리 방어
      }
      const next = byId(nextId);
      if (next) setPossessed(world, next.id, true);
      lastCommandAt = elapsed;
    },
  });

  /** pt 근처에서 가장 가까운 아군 유닛 */
  function nearestMine(pt: { x: number; z: number }): Entity | undefined {
    return myUnits().sort((a, b) => Math.hypot(a.x - pt.x, a.z - pt.z) - Math.hypot(b.x - pt.x, b.z - pt.z))[0];
  }

  function enter3D({ pt, auto }: { pt?: { x: number; z: number }; auto: boolean }): void {
    if (over) return;
    mode = 'battle';
    autoEntered = auto;
    game.classList.replace('mode-ops', 'mode-battle');
    battle.setActive(true);
    battle.render(world, 0); // 뷰가 최신 월드를 알도록
    const focus = pt ?? (inCombat(world) ? world.lastCombatPos : RALLY_POS[0]);
    const unit = nearestMine(focus);
    requestAnimationFrame(() => {
      if (unit) battle.possess(unit.id);
      else battle.focus(focus.x, focus.z);
    });
    flash(unit
      ? `${auto ? '⚔ 교전 발생 — ' : ''}${unit.name}에 빙의 · 화면을 클릭해 조준 시작`
      : '아군 유닛이 없습니다 — 전술 시점');
  }

  function enter2D(): void {
    mode = 'ops';
    battle.setActive(false); // 빙의 해제 포함
    game.classList.replace('mode-battle', 'mode-ops');
  }

  let bannerTimer = 0;
  function flash(text: string): void {
    const b = hud('banner');
    b.textContent = text;
    b.classList.remove('hidden');
    bannerTimer = 3;
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab' || over || !document.contains(game)) return;
    ev.preventDefault();
    if (mode === 'ops') enter3D({ auto: false });
    else enter2D();
  });
  hud('back').addEventListener('click', enter2D);
  hud('speed').addEventListener('click', () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    hud('speed').textContent = `${speed}×`;
  });

  const targetIds = () => (battle.selected().length ? battle.selected() : myUnits().map((e) => e.id));
  app.querySelector('.dock')!.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest('button');
    if (!btn) return;
    const { cmd, train } = btn.dataset;
    lastCommandAt = elapsed;
    if (cmd === 'possess') {
      const u = byId(battle.selected()[0] ?? null) ?? nearestMine(world.lastCombatPos);
      if (u) battle.possess(u.id); else flash('아군 유닛이 없습니다');
    } else if (cmd === 'all') battle.selectAll();
    else if (cmd === 'attack') orderUnits(world, targetIds(), { mode: 'attack', ...HQ_POS[1] });
    else if (cmd === 'hold') orderUnits(world, targetIds(), { mode: 'hold' });
    else if (cmd === 'retreat') orderUnits(world, targetIds(), { mode: 'move', ...RALLY_POS[0] });
    else if (cmd === 'overview') battle.overview();
    else if (train) {
      const r = quickTrain(train as UnitType);
      if (!r.ok) flash(r.reason);
    }
  });

  /** 전투 중 빠른 생산: 큐가 가장 짧은 생산 건물에 넣음 */
  function quickTrain(unitType: UnitType): Result {
    const producers = eco.buildings
      .filter((b) => b.done && pf.buildings[b.type].produces?.includes(unitType))
      .sort((a, b) => a.queue.length - b.queue.length);
    if (!producers.length) return { ok: false, reason: '생산 건물 없음' };
    return queueUnit(eco, producers[0].id, unitType);
  }

  let quickHtml = '';
  function renderBattleHud(fighting: boolean): void {
    hud('res').innerHTML = `<i class="dot ore"></i>${Math.floor(eco.ore)} <i class="dot gas"></i>${Math.floor(eco.gas)} · 인구 ${fmt1(eco.supplyUsed)}/${supplyCap(eco)}`;
    const html = (['infantry', 'ranged'] as const).map((u) => {
      const d = pf.units[u];
      return `<button data-train="${u}" ${canAfford(eco, d.cost) ? '' : 'disabled'}>${d.name}<small>${d.cost.ore}${d.cost.gas ? ` / ${d.cost.gas}g` : ''}</small></button>`;
    }).join('');
    if (html !== quickHtml) { quickHtml = html; hud('quick').innerHTML = `<span class="label">빠른 생산</span>${html}`; }
    const badge = hud('combat');
    badge.textContent = fighting ? '교전 중' : '평온';
    badge.classList.toggle('alert', fighting);
  }

  function endGame(won: boolean): void {
    over = true;
    if (mode === 'ops') enter3D({ auto: false });
    battle.release();
    const ov = app.querySelector<HTMLElement>('.overlay')!;
    ov.classList.remove('hidden');
    ov.innerHTML = `<div><h2>${won ? '승리' : '패배'}</h2><p>${fmtTime(elapsed)} 경과</p>
      <button class="primary">다시 하기</button></div>`;
    ov.querySelector('button')!.addEventListener('click', () => {
      destroyWorld(world); // Rust 쪽 메모리 해제
      // Rust 전투 코어(WASM)를 불러온 뒤 시작
fetch(combatWasmUrl)
  .then((r) => r.arrayBuffer())
  .then(initCombatCore)
  .then(showFactionSelect)
  .catch((err: unknown) => {
    app.innerHTML = `<div class="select"><h1>로딩 실패</h1><p>전투 코어(WASM)를 불러오지 못했습니다: ${String(err)}</p></div>`;
  });
    });
  }

  // ---------- 루프 ----------
  let last = performance.now();
  function frame(now: number): void {
    if (!document.contains(game)) return;
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const dt = over ? 0 : realDt * speed;
    const events: CombatEvent[] = [];

    if (!over) {
      elapsed += dt;
      for (const u of tickEconomy(eco, dt)) {
        const e = spawnUnit(world, 0, playerFaction, u);
        const dest = playerOrder === 'attack' ? HQ_POS[1] : RALLY_POS[0];
        orderUnits(world, [e.id], { mode: playerOrder, ...dest });
      }
      for (const u of tickEconomy(enemyEco, dt)) spawnUnit(world, 1, enemyFaction, u);
      if (tickAI(ai, enemyEco, elapsed, dt) === 'attack') {
        orderTeam(world, 1, 'attack');
        base.say(`⚠ 적 웨이브 ${ai.wave} 접근 중!`);
      }

      // 1인칭 빙의 유닛: 플레이어 입력으로 이동·사격
      const me = byId(battle.possessedId());
      if (mode === 'battle' && me) {
        const input = battle.fpsInput();
        if (input.active) lastCommandAt = elapsed;
        possessedMove(world, me, input.dx, input.dz, dt);
        if (input.firing) {
          const r = possessedFire(world, me, battle.aimTarget());
          if (r.ok) { events.push(r.event); battle.feedback('hit'); }
          else if (r.reason !== 'cooldown') battle.feedback(r.reason);
        }
      }

      // 고정 스텝 전투
      let remaining = dt;
      while (remaining > 0 && !over) {
        const step = Math.min(remaining, 1 / 30);
        remaining -= step;
        for (const ev of stepCombat(world, step)) {
          events.push(ev);
          if (ev.type !== 'death') continue;
          if (ev.kind === 'structure') endGame(ev.team === 1);
          else releaseSupply(ev.team === 0 ? eco : enemyEco, ev.supply);
        }
      }
    }
    world.events = events;

    // 교전 감지 → 자동 1인칭 전환 / 종료 후 자동 복귀
    const fighting = inCombat(world);
    if (fighting && !wasFighting && mode === 'ops' && autoSwitch) enter3D({ auto: true });
    const quiet = !fighting && mode === 'battle' && !over
      && world.time - world.lastCombatAt > AUTO_RETURN_QUIET && elapsed - lastCommandAt > AUTO_RETURN_QUIET;
    if (quiet && battle.possessedId() != null) {
      // 1인칭 조종 중에는 화면을 강제로 바꾸지 않고 안내만
      if (!quietHinted) { flash('교전 종료 — Tab으로 운영 화면 복귀'); quietHinted = true; }
    } else if (quiet && autoEntered) {
      enter2D();
      base.say('교전 종료 — 운영 화면으로 복귀');
    }
    if (fighting) quietHinted = false;
    wasFighting = fighting;

    if (mode === 'battle') {
      battle.render(world, realDt);
      renderBattleHud(fighting);
      if (bannerTimer > 0 && (bannerTimer -= realDt) <= 0) hud('banner').classList.add('hidden');
    } else {
      field.render(world, now / 1000);
      base.render(now / 1000, realDt, myUnits().length);
    }
    hud('time').textContent = fmtTime(elapsed);
    hud('wave').textContent = `다음 웨이브 ${fmtTime(Math.max(0, ai.nextWaveAt - elapsed))}`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Rust 전투 코어(WASM)를 불러온 뒤 시작
fetch(combatWasmUrl)
  .then((r) => r.arrayBuffer())
  .then(initCombatCore)
  .then(showFactionSelect)
  .catch((err: unknown) => {
    app.innerHTML = `<div class="select"><h1>로딩 실패</h1><p>전투 코어(WASM)를 불러오지 못했습니다: ${String(err)}</p></div>`;
  });
