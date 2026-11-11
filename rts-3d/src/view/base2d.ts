// 2D 운영 화면: 기지 맵(캔버스) + 건설/생산/일꾼 배치 패널
import { FACTIONS } from '../data/factions.ts';
import { supplyCap, gasCapacity, canAfford } from '../sim/economy.ts';
import type { Building, Economy } from '../sim/economy.ts';
import type { BuildingType, Cost, Result, UnitType } from '../types.ts';
import { drawIcon } from './icons.ts';

const W = 360;
const H = 240;
const HQ = { x: 200, y: 130 };
const MINERALS = Array.from({ length: 6 }, (_, i) => ({ x: 48 + (i % 2) * 18, y: 55 + i * 28 }));
const GEYSER = { x: 200, y: 32 };
const SLOTS = Array.from({ length: 12 }, (_, i) => ({ x: 270 + (i % 3) * 32, y: 50 + Math.floor(i / 3) * 44 }));

const fmtCost = (c: Cost) => `${c.ore}${c.gas ? ` / ${c.gas}g` : ''}`;
const fmt1 = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1));

export interface BaseHandlers {
  build(type: BuildingType): Result;
  train(buildingId: number, type: UnitType): Result;
  moveWorker(target: 'ore' | 'gas'): boolean;
  order(mode: 'attack' | 'hold'): void;
}

export interface BaseView {
  render(t: number, dt: number, armyCount: number): void;
  say(text: string): void;
}

type CachedEl = HTMLElement & { _html?: string };

export function createBaseView(root: HTMLElement, eco: Economy, handlers: BaseHandlers): BaseView {
  const faction = FACTIONS[eco.factionId];
  root.innerHTML = `
    <div class="resbar">
      <span><i class="dot ore"></i><b data-r="ore">0</b></span>
      <span><i class="dot gas"></i><b data-r="gas">0</b></span>
      <span>인구 <b data-r="supply">0/0</b></span>
    </div>
    <canvas class="basemap" width="${W * 2}" height="${H * 2}"></canvas>
    <div class="section">
      <h3>건설</h3>
      <div class="btns" data-slot="build"></div>
    </div>
    <div class="section">
      <h3>일꾼 <small data-r="workers"></small></h3>
      <div class="btns">
        <button data-act="worker-gas">광물 → 가스</button>
        <button data-act="worker-ore">가스 → 광물</button>
      </div>
    </div>
    <div class="section">
      <h3 data-r="selname">생산</h3>
      <div class="btns" data-slot="train"></div>
      <div class="queue" data-slot="queue"></div>
    </div>
    <div class="section">
      <h3>군대 명령 <small data-r="army"></small></h3>
      <div class="btns">
        <button class="primary" data-act="attack">공격 진격</button>
        <button data-act="hold">기지 방어</button>
      </div>
    </div>
    <p class="msg" data-r="msg"></p>
  `;

  const $ = (sel: string) => root.querySelector(sel) as CachedEl;
  const canvas = root.querySelector<HTMLCanvasElement>('.basemap')!;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  let selectedId = eco.buildings[0].id;
  let msgTimer = 0;

  const setHTML = (el: CachedEl, html: string) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
  const say = (text: string) => { $('[data-r="msg"]').textContent = text; msgTimer = 3; };

  root.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest('button');
    if (!btn) return;
    const { act, type } = btn.dataset;
    let res: Result = { ok: true };
    if (act === 'build') res = handlers.build(type as BuildingType);
    else if (act === 'train') res = handlers.train(selectedId, type as UnitType);
    else if (act === 'worker-gas') res = handlers.moveWorker('gas') ? { ok: true } : { ok: false, reason: '가스 건물 필요 또는 정원 초과' };
    else if (act === 'worker-ore') res = handlers.moveWorker('ore') ? { ok: true } : { ok: false, reason: '가스 일꾼 없음' };
    else if (act === 'attack' || act === 'hold') { handlers.order(act); say(act === 'attack' ? '적 본진으로 진격!' : '기지 방어 태세'); }
    else if (act === 'select') selectedId = Number(btn.dataset.id);
    if (!res.ok) say(res.reason);
    refreshPanel();
  });

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    const y = ((ev.clientY - rect.top) / rect.height) * H;
    const hit = positionedBuildings().find((p) => Math.hypot(p.x - x, p.y - y) < p.r);
    if (hit) { selectedId = hit.b.id; refreshPanel(); }
  });

  function positionedBuildings(): { b: Building; x: number; y: number; r: number }[] {
    let slot = 0;
    return eco.buildings.map((b) => {
      if (b.type === 'hq') return { b, ...HQ, r: 30 };
      if (b.type === 'gas' && !eco.buildings.some((o) => o.type === 'gas' && o.id < b.id)) return { b, ...GEYSER, r: 18 };
      const s = SLOTS[slot++ % SLOTS.length];
      return { b, ...s, r: 14 };
    });
  }

  function refreshPanel() {
    const defs = faction.buildings;
    setHTML($('[data-slot="build"]'), (['supply', 'gas', 'factory'] as const)
      .map((t) => `<button data-act="build" data-type="${t}" ${canAfford(eco, defs[t].cost) ? '' : 'disabled'}>
        ${defs[t].name}<small>${fmtCost(defs[t].cost)}</small></button>`).join(''));

    const sel = eco.buildings.find((b) => b.id === selectedId) ?? eco.buildings[0];
    selectedId = sel.id;
    const sdef = defs[sel.type];
    $('[data-r="selname"]').textContent = `생산 · ${sdef.name}${sel.done ? '' : ' (건설 중)'}`;
    setHTML($('[data-slot="train"]'), sel.done && sdef.produces
      ? sdef.produces.map((u) => {
          const ud = faction.units[u];
          return `<button data-act="train" data-type="${u}" ${canAfford(eco, ud.cost) ? '' : 'disabled'}>
            ${ud.name}<small>${fmtCost(ud.cost)} · ${fmt1(ud.supply)}인구</small></button>`;
        }).join('')
      : '<span class="hint">맵에서 생산 건물을 선택하세요</span>');
    setHTML($('[data-slot="queue"]'), sel.queue
      .map((j, i) => `<span class="${i === 0 ? 'active' : ''}">${faction.units[j.unitType].name} ${Math.ceil(j.remaining)}s</span>`).join(''));
  }

  function drawMap(t: number) {
    ctx.fillStyle = '#f5f5f7';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#e5e5ea';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    for (const m of MINERALS) { // 광물
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 9); ctx.lineTo(m.x + 7, m.y); ctx.lineTo(m.x, m.y + 9); ctx.lineTo(m.x - 7, m.y); ctx.fill();
    }
    ctx.fillStyle = '#34d399'; // 가스 분출구
    ctx.beginPath(); ctx.arc(GEYSER.x, GEYSER.y, 14, 0, Math.PI * 2); ctx.fill();

    const placed = positionedBuildings();
    const gasB = placed.find((p) => p.b.type === 'gas' && p.b.done);
    // 일꾼 왕복 애니메이션
    for (let i = 0; i < eco.workersOre; i++) {
      const m = MINERALS[i % MINERALS.length];
      const k = (Math.sin(t * 0.9 + i * 1.7) + 1) / 2;
      drawWorker(m.x + 10 + (HQ.x - 28 - m.x - 10) * k, m.y + (HQ.y - m.y) * k);
    }
    for (let i = 0; i < Math.min(eco.workersGas, gasCapacity(eco)); i++) {
      const k = (Math.sin(t * 1.1 + i * 2.1) + 1) / 2;
      const g = gasB ?? { x: GEYSER.x, y: GEYSER.y };
      drawWorker(g.x - 6 + i * 6, g.y + 18 + (HQ.y - 30 - g.y - 18) * k);
    }

    for (const p of placed) {
      ctx.globalAlpha = p.b.done ? 1 : 0.35 + 0.4 * (p.b.progress / faction.buildings[p.b.type].buildTime);
      drawIcon(ctx, eco.factionId, p.b.type, p.x, p.y, p.r);
      ctx.globalAlpha = 1;
      if (p.b.id === selectedId) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (!p.b.done) {
        const k = p.b.progress / faction.buildings[p.b.type].buildTime;
        ctx.fillStyle = '#d1d1d6'; ctx.fillRect(p.x - p.r, p.y + p.r + 3, p.r * 2, 3);
        ctx.fillStyle = '#111'; ctx.fillRect(p.x - p.r, p.y + p.r + 3, p.r * 2 * k, 3);
      }
      if (p.b.queue.length) {
        const job = p.b.queue[0];
        const k = 1 - job.remaining / faction.units[job.unitType].buildTime;
        ctx.fillStyle = '#d1d1d6'; ctx.fillRect(p.x - p.r, p.y + p.r + 3, p.r * 2, 3);
        ctx.fillStyle = '#0071e3'; ctx.fillRect(p.x - p.r, p.y + p.r + 3, p.r * 2 * k, 3);
      }
    }
  }

  function drawWorker(x: number, y: number) {
    drawIcon(ctx, eco.factionId, 'worker', x, y, 5);
  }

  let panelTimer = 0;
  return {
    render(t: number, dt: number, armyCount: number) {
      drawMap(t);
      $('[data-r="ore"]').textContent = String(Math.floor(eco.ore));
      $('[data-r="gas"]').textContent = String(Math.floor(eco.gas));
      $('[data-r="supply"]').textContent = `${fmt1(eco.supplyUsed)}/${supplyCap(eco)}`;
      $('[data-r="workers"]').textContent = `광물 ${eco.workersOre} · 가스 ${eco.workersGas}/${gasCapacity(eco)}`;
      $('[data-r="army"]').textContent = `병력 ${armyCount}`;
      panelTimer -= dt;
      if (panelTimer <= 0) { panelTimer = 0.25; refreshPanel(); }
      if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('[data-r="msg"]').textContent = ''; }
    },
    say,
  };
}
