// 2D 전략 지도: 전장 전체를 위에서 본 모습. 클릭하면 그 지점으로 3D 전환.
import { MAP, inCombat } from '../sim/combat.ts';
import type { World } from '../sim/combat.ts';
import { drawIcon } from './icons.ts';

const PAD = 16;

export interface FieldView { render(world: World, t: number): void }

export function createFieldView(root: HTMLElement, { onOpen3D }: { onOpen3D: (pt?: { x: number; z: number }) => void }): FieldView {
  root.innerHTML = `
    <div class="field-head">
      <h3>전장</h3>
      <span class="badge" data-f="status">평온</span>
      <button class="primary" data-f="open">3D 1인칭 개입 <small>Tab</small></button>
    </div>
    <canvas class="fieldmap"></canvas>
    <p class="hint">지도를 클릭하면 그 지점에서 가장 가까운 아군 유닛에 1인칭으로 빙의합니다.</p>`;

  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const status = root.querySelector<HTMLElement>('[data-f="status"]')!;
  let W = 0, H = 0, scale = 1;

  function resize() {
    const w = canvas.clientWidth;
    const h = Math.round(w * (MAP.halfZ * 2 + PAD) / (MAP.halfX * 2 + PAD));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h;
    scale = W / (MAP.halfX * 2 + PAD);
  }
  new ResizeObserver(resize).observe(canvas);

  const toScreen = (x: number, z: number): [number, number] => [W / 2 + x * scale, H / 2 + z * scale];

  root.querySelector('[data-f="open"]')!.addEventListener('click', () => onOpen3D());
  canvas.addEventListener('click', (ev) => {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left - W / 2) / scale;
    const z = (ev.clientY - r.top - H / 2) / scale;
    onOpen3D({ x, z });
  });

  return {
    render(world: World, t: number) {
      if (!W) resize();
      ctx.fillStyle = '#f5f5f7';
      ctx.fillRect(0, 0, W, H);
      const [x0, y0] = toScreen(-MAP.halfX, -MAP.halfZ);
      const [x1, y1] = toScreen(MAP.halfX, MAP.halfZ);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e5e5ea';
      ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, y0); ctx.lineTo(W / 2, y1); ctx.stroke();

      const fighting = inCombat(world);
      if (fighting) {
        const [cx, cy] = toScreen(world.lastCombatPos.x, world.lastCombatPos.z);
        const pulse = 18 + Math.sin(t * 6) * 4;
        ctx.fillStyle = 'rgba(255,59,48,0.15)';
        ctx.beginPath(); ctx.arc(cx, cy, pulse * (scale / 8) + 10, 0, Math.PI * 2); ctx.fill();
      }
      status.textContent = fighting ? '교전 중' : '평온';
      status.classList.toggle('alert', fighting);

      const unitR = Math.max(4, scale * 0.7);
      for (const e of world.entities) {
        const [sx, sy] = toScreen(e.x, e.z);
        drawIcon(ctx, e.factionId, e.kind === 'structure' ? 'hq' : e.type, sx, sy,
          e.kind === 'structure' ? unitR * 3 : unitR, { team: e.team });
      }
    },
  };
}
