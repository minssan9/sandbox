// 게임 화면: 2D 운영 ↔ 3D(1인칭/전술) 전환과 프레임 루프. 싱글/멀티 모두 Session 하나로 동작한다.
import { FACTIONS } from './data/factions.ts';
import { supplyCap, canAfford, UNIT_CAP } from './sim/economy.ts';
import { inCombat, HQ_POS, RALLY_POS } from './sim/combat.ts';
import type { Entity } from './sim/combat.ts';
import { createBaseView } from './view/base2d.ts';
import { createFieldView } from './view/field2d.ts';
import { createBattleView } from './view/battle3d.ts';
import { bestProducer } from './session/session.ts';
import type { Session } from './session/session.ts';
import type { UnitType } from './types.ts';

const AUTO_RETURN_QUIET = 6; // 교전 종료 후 이 시간(초) 동안 조작이 없으면 2D로 자동 복귀
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function startGame(app: HTMLElement, session: Session, onExit: () => void): void {
  const pf = FACTIONS[session.myFaction];
  const ef = FACTIONS[session.enemyFaction];
  const me = session.team;
  const foe = me === 0 ? 1 : 0;
  const { world, eco } = session;

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
          <button data-h="speed" ${session.canChangeSpeed ? '' : 'hidden'}>1×</button>
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

  let speed = 1;
  let over = false;
  let mode: 'ops' | 'battle' = 'ops';
  let autoEntered = false;
  let lastCommandAt = -999;
  let wasFighting = false;
  let autoSwitch = true;
  let quietHinted = false;

  const byId = (id: number | null) => (id == null ? undefined : world.entities.find((e) => e.id === id));
  const myUnits = () => world.entities.filter((e) => e.team === me && e.kind === 'unit');

  // ---------- 2D 운영 ----------
  const base = createBaseView(app.querySelector<HTMLElement>('.ops')!, eco, {
    build: (type) => session.build(type),
    train: (id, type) => session.train(id, type),
    moveWorker: (to) => session.moveWorker(to),
    order: (m) => session.orderTeam(m),
  });
  const field = createFieldView(app.querySelector<HTMLElement>('.field')!, {
    onOpen3D: (pt) => enter3D({ pt, auto: false }),
    playerTeam: me,
  });
  app.querySelector('.field-head')!.insertAdjacentHTML('beforeend',
    `<span class="badge">${pf.name} vs ${ef.name} · ${session.label}</span>
     <label class="toggle"><input type="checkbox" checked data-h="auto"> 교전 시 자동 1인칭 전환</label>`);
  hud('auto').addEventListener('change', (ev) => { autoSwitch = (ev.target as HTMLInputElement).checked; });

  // ---------- 3D 전투 ----------
  const battle = createBattleView(app.querySelector<HTMLElement>('.battle')!, {
    playerTeam: me,
    onCommand: (cmd) => {
      session.orderUnits(cmd.ids, cmd);
      lastCommandAt = session.elapsed;
    },
    onSelect: (ids) => { hud('selcount').textContent = `선택 ${ids.length}`; },
    onPossess: (prevId, nextId) => {
      session.setPossessed(prevId, nextId);
      lastCommandAt = session.elapsed;
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
    const focus = pt ?? (inCombat(world) ? world.lastCombatPos : RALLY_POS[me]);
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
  function notify(text: string): void {
    if (mode === 'battle') flash(text);
    else base.say(text);
  }

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Tab' || over) return;
    ev.preventDefault();
    if (mode === 'ops') enter3D({ auto: false });
    else enter2D();
  };
  window.addEventListener('keydown', onKey);
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
    lastCommandAt = session.elapsed;
    if (cmd === 'possess') {
      const u = byId(battle.selected()[0] ?? null) ?? nearestMine(world.lastCombatPos);
      if (u) battle.possess(u.id); else flash('아군 유닛이 없습니다');
    } else if (cmd === 'all') battle.selectAll();
    else if (cmd === 'attack') session.orderUnits(targetIds(), { mode: 'attack', ...HQ_POS[foe] });
    else if (cmd === 'hold') session.orderUnits(targetIds(), { mode: 'hold' });
    else if (cmd === 'retreat') session.orderUnits(targetIds(), { mode: 'move', ...RALLY_POS[me] });
    else if (cmd === 'overview') battle.overview();
    else if (train) {
      // 빠른 생산: 큐가 가장 짧은 생산 건물에
      const b = bestProducer(eco, (t) => pf.buildings[t].produces, train as UnitType);
      const r = b ? session.train(b.id, train as UnitType) : { ok: false as const, reason: '생산 건물 없음' };
      if (!r.ok) flash(r.reason);
    }
  });

  let quickHtml = '';
  function renderBattleHud(fighting: boolean): void {
    hud('res').innerHTML = `<i class="dot ore"></i>${Math.floor(eco.ore)} <i class="dot gas"></i>${Math.floor(eco.gas)}`
      + ` · 인구 ${fmt1(eco.supplyUsed)}/${supplyCap(eco)} · 유닛 ${eco.army}/${UNIT_CAP}`;
    const html = (['infantry', 'ranged'] as const).map((u) => {
      const d = pf.units[u];
      return `<button data-train="${u}" ${canAfford(eco, d.cost) ? '' : 'disabled'}>${d.name}<small>${d.cost.ore}${d.cost.gas ? ` / ${d.cost.gas}g` : ''}</small></button>`;
    }).join('');
    if (html !== quickHtml) { quickHtml = html; hud('quick').innerHTML = `<span class="label">빠른 생산</span>${html}`; }
    const badge = hud('combat');
    badge.textContent = fighting ? '교전 중' : '평온';
    badge.classList.toggle('alert', fighting);
  }

  function endGame(won: boolean, reason?: string): void {
    over = true;
    if (mode === 'ops') enter3D({ auto: false });
    battle.release();
    const ov = app.querySelector<HTMLElement>('.overlay')!;
    ov.classList.remove('hidden');
    ov.innerHTML = `<div><h2>${won ? '승리' : '패배'}</h2><p>${reason ? `${reason} · ` : ''}${fmtTime(session.elapsed)} 경과</p>
      <button class="primary">메뉴로</button></div>`;
    ov.querySelector('button')!.addEventListener('click', () => {
      window.removeEventListener('keydown', onKey);
      battle.setActive(false);
      session.dispose();
      onExit();
    });
  }

  // ---------- 루프 ----------
  let last = performance.now();
  function frame(now: number): void {
    if (!document.contains(game)) return;
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (!over) {
      const possessed = mode === 'battle' ? battle.possessedId() : null;
      const input = possessed != null ? battle.fpsInput() : null;
      if (input?.active) lastCommandAt = session.elapsed;
      const aim = battle.aimTarget();
      const up = session.update(realDt, speed, possessed != null && input
        ? { id: possessed, dx: input.dx, dz: input.dz, firing: input.firing, aimId: aim?.id ?? null }
        : null);
      if (up.fire) battle.feedback(up.fire);
      if (up.possessLost && battle.possessedId() != null) {
        // 서버가 빙의를 거부함(네트워크 지연 중 유닛 사망 등) → 다른 아군으로, 없으면 전술 시점
        const lost = battle.possessedId();
        const here = byId(lost) ?? world.lastCombatPos;
        const next = myUnits().filter((e) => e.id !== lost)
          .sort((a, b) => Math.hypot(a.x - here.x, a.z - here.z) - Math.hypot(b.x - here.x, b.z - here.z))[0];
        if (next) battle.possess(next.id);
        else { battle.release(); flash('빙의할 아군 유닛이 없습니다 — 전술 시점'); }
      }
      for (const n of up.notices) notify(n);
      if (up.over) endGame(up.over.won, up.over.reason);
    }

    // 교전 감지 → 자동 1인칭 전환 / 종료 후 자동 복귀
    const fighting = inCombat(world);
    if (fighting && !wasFighting && mode === 'ops' && autoSwitch && !over) enter3D({ auto: true });
    const quiet = !fighting && mode === 'battle' && !over
      && world.time - world.lastCombatAt > AUTO_RETURN_QUIET && session.elapsed - lastCommandAt > AUTO_RETURN_QUIET;
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
    hud('time').textContent = fmtTime(session.elapsed);
    hud('wave').textContent = session.nextWaveAt != null
      ? `다음 웨이브 ${fmtTime(Math.max(0, session.nextWaveAt - session.elapsed))}`
      : `vs ${ef.name}`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
