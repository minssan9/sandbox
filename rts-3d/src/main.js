import './style.css';
import { FACTIONS, FACTION_IDS } from './data/factions.js';
import { createEconomy, tickEconomy, queueBuilding, queueUnit, moveWorker, releaseSupply, supplyCap, canAfford } from './sim/economy.js';
import { createWorld, spawnStructure, spawnUnit, orderTeam, orderUnits, stepCombat, inCombat, HQ_POS, RALLY_POS } from './sim/combat.js';
import { createAI, tickAI } from './sim/ai.js';
import { createBaseView } from './view/base2d.js';
import { createFieldView } from './view/field2d.js';
import { createBattleView } from './view/battle3d.js';
import { iconCanvas } from './view/icons.js';

const app = document.getElementById('app');
const AUTO_RETURN_QUIET = 6; // 교전 종료 후 이 시간(초) 지나면 2D로 자동 복귀
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt1 = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

function showFactionSelect() {
  app.innerHTML = `
    <div class="select">
      <h1>Three Fronts</h1>
      <p>2D로 운영하고, 교전이 벌어지면 3D로 뛰어들어 지휘하세요.</p>
      <div class="cards">
        ${FACTION_IDS.map((id) => `
          <button class="card" data-faction="${id}">
            <span class="icon" data-icon="${id}"></span>
            <b>${FACTIONS[id].name}</b>
            <small>${FACTIONS[id].desc}</small>
          </button>`).join('')}
      </div>
    </div>`;
  app.querySelectorAll('[data-icon]').forEach((el) => el.appendChild(iconCanvas(el.dataset.icon, 'hq', 0, 96)));
  app.querySelectorAll('[data-faction]').forEach((btn) =>
    btn.addEventListener('click', () => startGame(btn.dataset.faction)));
}

function startGame(playerFaction) {
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
            <button data-cmd="all">전체 선택 <small>Ctrl+A</small></button>
            <button data-cmd="attack">공격 진격</button>
            <button data-cmd="hold">정지 <small>S</small></button>
            <button data-cmd="retreat">후퇴</button>
            <button data-cmd="overview">전장 전체</button>
          </div>
          <div class="group" data-h="quick"></div>
          <p class="keys">좌클릭·드래그 선택 · 우클릭 이동/공격 · Shift+우클릭 / A 공격 이동 · 휠 줌 · 가운데 드래그 회전 · 방향키 이동</p>
        </div>
        <div class="overlay hidden"></div>
      </main>
    </div>`;

  const game = app.querySelector('.game');
  const hud = (k) => app.querySelector(`[data-h="${k}"]`);

  const eco = createEconomy(playerFaction);
  const enemyEco = createEconomy(enemyFaction);
  const ai = createAI();
  const world = createWorld();
  spawnStructure(world, 0, playerFaction, 'hq');
  spawnStructure(world, 1, enemyFaction, 'hq');

  let playerOrder = 'hold';
  let speed = 1;
  let elapsed = 0;
  let over = false;
  let mode = 'ops';
  let autoEntered = false; // 자동 전환으로 들어온 3D인지
  let lastCommandAt = -999;
  let wasFighting = false;
  let autoSwitch = true;

  // ---------- 2D 운영 ----------
  const base = createBaseView(app.querySelector('.ops'), eco, {
    build: (type) => queueBuilding(eco, type),
    train: (id, type) => queueUnit(eco, id, type),
    moveWorker: (target) => moveWorker(eco, target),
    order: (m) => { playerOrder = m; orderTeam(world, 0, m); },
  });
  const field = createFieldView(app.querySelector('.field'), {
    onOpen3D: (pt) => enter3D({ pt, auto: false }),
  });
  const fieldHead = app.querySelector('.field-head');
  fieldHead.insertAdjacentHTML('beforeend',
    '<label class="toggle"><input type="checkbox" checked data-h="auto"> 교전 시 자동 3D 전환</label>');
  hud('auto').addEventListener('change', (ev) => { autoSwitch = ev.target.checked; });

  // ---------- 3D 전투 ----------
  const battle = createBattleView(app.querySelector('.battle'), {
    playerTeam: 0,
    onCommand: (cmd) => {
      orderUnits(world, cmd.ids, cmd);
      lastCommandAt = elapsed;
    },
    onSelect: (ids) => { hud('selcount').textContent = `선택 ${ids.length}`; },
  });

  function enter3D({ pt, auto }) {
    if (over) return;
    mode = 'battle';
    autoEntered = auto;
    game.classList.replace('mode-ops', 'mode-battle');
    battle.setActive(true);
    requestAnimationFrame(() => {
      if (pt) battle.focus(pt.x, pt.z);
      else if (inCombat(world)) battle.focus(world.lastCombatPos.x, world.lastCombatPos.z);
      else battle.overview();
    });
    if (auto) {
      flash('⚔ 교전 발생 — 3D 전장으로 전환');
      battle.selectAll();
    }
  }

  function enter2D() {
    mode = 'ops';
    game.classList.replace('mode-battle', 'mode-ops');
    battle.setActive(false);
  }

  let bannerTimer = 0;
  function flash(text) {
    const b = hud('banner');
    b.textContent = text;
    b.classList.remove('hidden');
    bannerTimer = 2.5;
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

  const myUnits = () => world.entities.filter((e) => e.team === 0 && e.kind === 'unit').map((e) => e.id);
  const targetIds = () => (battle.selected().length ? battle.selected() : myUnits());
  app.querySelector('.dock').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const { cmd, train } = btn.dataset;
    lastCommandAt = elapsed;
    if (cmd === 'all') battle.selectAll();
    else if (cmd === 'attack') orderUnits(world, targetIds(), { mode: 'attack', ...HQ_POS[1] });
    else if (cmd === 'hold') orderUnits(world, targetIds(), { mode: 'hold' });
    else if (cmd === 'retreat') orderUnits(world, targetIds(), { mode: 'move', ...RALLY_POS[0] });
    else if (cmd === 'overview') battle.overview();
    else if (train) {
      const r = quickTrain(train);
      if (!r.ok) flash(r.reason);
    }
  });

  /** 전투 중 빠른 생산: 해당 유닛을 만들 수 있는 건물 중 큐가 가장 짧은 곳 */
  function quickTrain(unitType) {
    const producers = eco.buildings
      .filter((b) => b.done && pf.buildings[b.type].produces?.includes(unitType))
      .sort((a, b) => a.queue.length - b.queue.length);
    if (!producers.length) return { ok: false, reason: '생산 건물 없음' };
    return queueUnit(eco, producers[0].id, unitType);
  }

  let quickHtml = '';
  function renderBattleHud() {
    hud('res').innerHTML = `<i class="dot ore"></i>${Math.floor(eco.ore)} <i class="dot gas"></i>${Math.floor(eco.gas)} · 인구 ${fmt1(eco.supplyUsed)}/${supplyCap(eco)}`;
    const html = ['infantry', 'ranged'].map((u) => {
      const d = pf.units[u];
      return `<button data-train="${u}" ${canAfford(eco, d.cost) ? '' : 'disabled'}>${d.name}<small>${d.cost.ore}${d.cost.gas ? ` / ${d.cost.gas}g` : ''}</small></button>`;
    }).join('');
    if (html !== quickHtml) { quickHtml = html; hud('quick').innerHTML = `<span class="label">빠른 생산</span>${html}`; }
  }

  function endGame(won) {
    over = true;
    if (mode === 'ops') enter3D({ auto: false });
    const ov = app.querySelector('.overlay');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div><h2>${won ? '승리' : '패배'}</h2><p>${fmtTime(elapsed)} 경과</p>
      <button class="primary">다시 하기</button></div>`;
    ov.querySelector('button').addEventListener('click', showFactionSelect);
  }

  // ---------- 루프 ----------
  let last = performance.now();
  function frame(now) {
    if (!document.contains(game)) return;
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const dt = over ? 0 : realDt * speed;

    const events = [];
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

      // 고정 스텝 전투, 이벤트는 모아서 한 번에 렌더
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

    // 교전 감지 → 자동 3D 전환 / 종료 후 자동 복귀
    const fighting = inCombat(world);
    if (fighting && !wasFighting && mode === 'ops' && autoSwitch) enter3D({ auto: true });
    if (!fighting && mode === 'battle' && autoEntered && !over
        && world.time - world.lastCombatAt > AUTO_RETURN_QUIET && elapsed - lastCommandAt > AUTO_RETURN_QUIET) {
      enter2D();
      base.say('교전 종료 — 운영 화면으로 복귀');
    }
    wasFighting = fighting;

    if (mode === 'battle') {
      battle.render(world, realDt);
      renderBattleHud();
      const badge = hud('combat');
      badge.textContent = fighting ? '교전 중' : '평온';
      badge.classList.toggle('alert', fighting);
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

showFactionSelect();
