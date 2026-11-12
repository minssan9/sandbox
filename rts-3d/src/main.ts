// 메뉴: 싱글(vs AI) / 멀티(1대1 온라인, 방 코드) 선택 → 게임 시작
import './style.css';
import { FACTIONS, FACTION_IDS } from './data/factions.ts';
import { initCombatCore } from './sim/combat.ts';
import combatWasmUrl from './sim/wasm/combat_core.wasm?url';
import { iconCanvas } from './view/icons.ts';
import { startGame } from './game.ts';
import { LocalSession } from './session/local.ts';
import { RemoteSession } from './session/remote.ts';
import { wsUrl } from './net/protocol.ts';
import type { ClientMsg, ServerMsg } from './net/protocol.ts';
import type { FactionId } from './types.ts';

const app = document.getElementById('app')!;
type Mode = 'single' | 'multi';
let mode: Mode = 'single';
let faction: FactionId = 'coalition';

function showMenu(message = ''): void {
  if (document.pointerLockElement) document.exitPointerLock();
  app.innerHTML = `
    <div class="select">
      <h1>Three Fronts</h1>
      <p>2D로 운영하고, 교전이 벌어지면 1인칭으로 뛰어들어 싸우세요.</p>
      <div class="segmented" role="tablist">
        <button data-mode="single" class="${mode === 'single' ? 'on' : ''}">싱글 플레이 <small>vs AI</small></button>
        <button data-mode="multi" class="${mode === 'multi' ? 'on' : ''}">멀티 플레이 <small>1대1 온라인</small></button>
      </div>
      <div class="cards">
        ${FACTION_IDS.map((id) => `
          <button class="card ${mode === 'multi' && id === faction ? 'picked' : ''}" data-faction="${id}">
            <span class="icon" data-icon="${id}"></span>
            <b>${FACTIONS[id].name}</b>
            <small>${FACTIONS[id].desc}</small>
          </button>`).join('')}
      </div>
      ${mode === 'multi' ? `
        <div class="lobby">
          <button class="primary" data-act="create">방 만들기</button>
          <span class="or">또는</span>
          <input data-code maxlength="4" placeholder="방 코드" autocomplete="off" spellcheck="false" />
          <button data-act="join">참가</button>
        </div>` : '<p class="hint">종족을 선택하면 바로 시작합니다.</p>'}
      <p class="msg" data-msg>${message}</p>
    </div>`;

  app.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) =>
    el.appendChild(iconCanvas(el.dataset.icon as FactionId, 'hq', 0, 96)));
  app.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => { mode = b.dataset.mode as Mode; showMenu(); }));
  app.querySelectorAll<HTMLElement>('[data-faction]').forEach((btn) =>
    btn.addEventListener('click', () => {
      faction = btn.dataset.faction as FactionId;
      if (mode === 'single') startSingle();
      else showMenu();
    }));
  app.querySelector('[data-act="create"]')?.addEventListener('click', () => connect({ t: 'create', faction }));
  const codeInput = app.querySelector<HTMLInputElement>('[data-code]');
  const join = () => {
    const code = codeInput?.value.trim().toUpperCase() ?? '';
    if (code.length !== 4) { showMenu('4자리 방 코드를 입력하세요'); return; }
    connect({ t: 'join', code, faction });
  };
  app.querySelector('[data-act="join"]')?.addEventListener('click', join);
  codeInput?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') join(); });
}

function startSingle(): void {
  const others = FACTION_IDS.filter((f) => f !== faction);
  const enemy = others[Math.floor(Math.random() * others.length)];
  startGame(app, new LocalSession(faction, enemy), () => showMenu());
}

/** 서버 접속 → 방 만들기/참가 → 상대가 들어오면 게임 시작 */
function connect(first: ClientMsg): void {
  const ws = new WebSocket(wsUrl());
  let code = '';
  let started = false;
  const waiting = (text: string) => {
    app.innerHTML = `
      <div class="select">
        <h1>Three Fronts</h1>
        <div class="waiting">${text}</div>
        <button data-act="cancel">취소</button>
      </div>`;
    app.querySelector('[data-act="cancel"]')!.addEventListener('click', () => { ws.close(); showMenu(); });
  };
  waiting('서버에 연결 중…');

  ws.addEventListener('open', () => ws.send(JSON.stringify(first)));
  ws.addEventListener('error', () => {
    if (!started) showMenu('서버에 연결할 수 없습니다. 게임 서버가 실행 중인지 확인하세요 (cargo run -p server).');
  });
  const onMessage = (ev: MessageEvent) => {
    const msg = JSON.parse(String(ev.data)) as ServerMsg;
    if (msg.t === 'room') {
      code = msg.code;
      if (msg.team === 0) {
        waiting(`방 코드 <b class="code">${code}</b><br><small>상대에게 코드를 알려주세요 · 상대를 기다리는 중…</small>`);
      } else {
        waiting('게임 시작 중…');
      }
    } else if (msg.t === 'start') {
      started = true;
      ws.removeEventListener('message', onMessage);
      const session = new RemoteSession(ws, msg.team, msg.factions, `방 ${code}`);
      startGame(app, session, () => showMenu());
    } else if (msg.t === 'error') {
      ws.close();
      showMenu(msg.reason);
    }
  };
  ws.addEventListener('message', onMessage);
}

// Rust 전투 코어(WASM)를 불러온 뒤 메뉴 표시 (싱글 플레이 전투에 사용)
fetch(combatWasmUrl)
  .then((r) => r.arrayBuffer())
  .then(initCombatCore)
  .then(() => showMenu())
  .catch((err: unknown) => {
    app.innerHTML = `<div class="select"><h1>로딩 실패</h1><p>전투 코어(WASM)를 불러오지 못했습니다: ${String(err)}</p></div>`;
  });
