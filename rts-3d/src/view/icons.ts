// 2D 아이콘(스프라이트) 생성기: 2D 운영 화면과 3D 빌보드가 같은 그림을 공유
import { FACTIONS } from '../data/factions.ts';
import type { FactionId } from '../types.ts';

type Ctx = CanvasRenderingContext2D;

function factionShape(ctx: Ctx, factionId: FactionId, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  if (factionId === 'coalition') {
    const s = r * 0.85;
    ctx.roundRect(cx - s, cy - s, s * 2, s * 2, r * 0.25);
  } else if (factionId === 'swarm') {
    const spikes = 9;
    for (let i = 0; i <= spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.72;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
  } else {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.85, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.85, cy);
  }
  ctx.closePath();
}

function glyph(ctx: Ctx, type: string, cx: number, cy: number, r: number): void {
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (type) {
    case 'worker': // 곡괭이
      ctx.moveTo(cx - r * 0.35, cy + r * 0.35); ctx.lineTo(cx + r * 0.25, cy - r * 0.25);
      ctx.moveTo(cx - r * 0.05, cy - r * 0.4); ctx.quadraticCurveTo(cx + r * 0.35, cy - r * 0.35, cx + r * 0.4, cy + r * 0.05);
      ctx.stroke(); break;
    case 'infantry': // 셰브론
      ctx.moveTo(cx - r * 0.35, cy + r * 0.15); ctx.lineTo(cx, cy - r * 0.2); ctx.lineTo(cx + r * 0.35, cy + r * 0.15);
      ctx.stroke(); break;
    case 'ranged': // 조준선
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx + r * 0.5, cy);
      ctx.moveTo(cx, cy - r * 0.5); ctx.lineTo(cx, cy + r * 0.5);
      ctx.stroke(); break;
    default: { // 건물: 첫 글자
      ctx.font = `600 ${r * 0.8}px -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type[0].toUpperCase(), cx, cy + r * 0.04);
    }
  }
}

/** 캔버스 컨텍스트에 아이콘을 그림 */
export function drawIcon(ctx: Ctx, factionId: FactionId, type: string, cx: number, cy: number, r: number, { team = 0 } = {}): void {
  const color = FACTIONS[factionId].color;
  ctx.save();
  factionShape(ctx, factionId, cx, cy, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = team === 0 ? '#ffffff' : '#ef4444';
  ctx.stroke();
  glyph(ctx, type, cx, cy, r);
  ctx.restore();
}

const cache = new Map<string, HTMLCanvasElement>();
/** 3D 텍스처용 오프스크린 캔버스(캐시) */
export function iconCanvas(factionId: FactionId, type: string, team: number, px = 128): HTMLCanvasElement {
  const key = `${factionId}:${type}:${team}:${px}`;
  if (!cache.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = px;
    drawIcon(c.getContext('2d')!, factionId, type, px / 2, px / 2, px * 0.42, { team });
    cache.set(key, c);
  }
  return cache.get(key)!;
}
