import './style.css';
import { FACTIONS, FACTION_IDS } from './data/factions.js';
import { createEconomy, tickEconomy, queueBuilding, queueUnit, moveWorker, releaseSupply } from './sim/economy.js';
import { createWorld, spawnStructure, spawnUnit, orderTeam, stepCombat } from './sim/combat.js';
import { createAI, tickAI } from './sim/ai.js';
import { createBaseView } from './view/base2d.js';
import { createBattleView } from './view/battle3d.js';
import { iconCanvas } from './view/icons.js';

const app = document.getElementById('app');

function showFactionSelect() {
  app.innerHTML = `
    <div class="select">
      <h1>Three Fronts</h1>
      <p>2D로 운영하고, 3D에서 싸운다. 종족을 선택하세요.</p>
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

  app.innerHTML = `
    <div class="game">
      <aside class="ops"></aside>
      <main class="battle">
        <div class="hud">
          <span data-h="time">0:00</span>
          <span data-h="wave"></span>
          <span data-h="vs">${FACTIONS[playerFaction].name} vs ${FACTIONS[enemyFaction].name}</span>
          <button data-h="speed">1×</button>
        </div>
        <div class="overlay hidden"></div>
      </main>
    </div>`;

  const eco = createEconomy(playerFaction);
  const enemyEco = createEconomy(enemyFaction, { ore: 50 });
  const ai = createAI();
  const world = createWorld();
  spawnStructure(world, 0, playerFaction, 'hq');
  spawnStructure(world, 1, enemyFaction, 'hq');

  let playerOrder = 'hold';
  let speed = 1;
  let elapsed = 0;
  let over = false;

  const base = createBaseView(app.querySelector('.ops'), eco, {
    build: (type) => queueBuilding(eco, type),
    train: (id, type) => queueUnit(eco, id, type),
    moveWorker: (target) => moveWorker(eco, target),
    order: (mode) => { playerOrder = mode; orderTeam(world, 0, mode); },
  });
  const battle = createBattleView(app.querySelector('.battle'));
  const hud = (k) => app.querySelector(`[data-h="${k}"]`);
  hud('speed').addEventListener('click', () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    hud('speed').textContent = `${speed}×`;
  });

  function endGame(won) {
    over = true;
    const ov = app.querySelector('.overlay');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div><h2>${won ? '승리' : '패배'}</h2><p>${fmtTime(elapsed)} 경과</p>
      <button class="primary">다시 하기</button></div>`;
    ov.querySelector('button').addEventListener('click', showFactionSelect);
  }

  let last = performance.now();
  function frame(now) {
    if (!app.contains(document.querySelector('.game'))) return;
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const dt = over ? 0 : realDt * speed;

    if (!over) {
      elapsed += dt;
      for (const u of tickEconomy(eco, dt)) {
        const e = spawnUnit(world, 0, playerFaction, u);
        orderTeamUnit(e, playerOrder);
      }
      for (const u of tickEconomy(enemyEco, dt)) spawnUnit(world, 1, enemyFaction, u);
      if (tickAI(ai, enemyEco, elapsed, dt) === 'attack') {
        orderTeam(world, 1, 'attack');
        base.say(`⚠ 적 웨이브 ${ai.wave} 접근 중!`);
      }

      // 고정 스텝으로 전투 진행, 이벤트는 모아서 한 번에 렌더
      const events = [];
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
      world.events = events;
    } else {
      world.events = [];
    }
    battle.render(world, realDt);

    const army = world.entities.filter((e) => e.team === 0 && e.kind === 'unit').length;
    base.render(now / 1000, realDt, army);
    hud('time').textContent = fmtTime(elapsed);
    hud('wave').textContent = `다음 적 웨이브 ${fmtTime(Math.max(0, ai.nextWaveAt - elapsed))}`;
    requestAnimationFrame(frame);
  }

  function orderTeamUnit(e, mode) {
    if (mode === 'attack') orderTeam(world, 0, 'attack');
    else e.order.mode = 'hold';
  }

  requestAnimationFrame(frame);
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

showFactionSelect();
