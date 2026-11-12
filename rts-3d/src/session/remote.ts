// 멀티 플레이: Rust 서버가 권한(authoritative)을 갖고, 클라이언트는 명령 전송 + 스냅샷 표시만 한다.
//  - 위치는 스냅샷 사이를 부드럽게 보간
//  - 1인칭 빙의 유닛은 입력 지연을 줄이려고 로컬 예측 후 서버 위치로 서서히 보정
import { FACTIONS } from '../data/factions.ts';
import type { Command, CombatEvent, Entity, OrderMode } from '../sim/combat.ts';
import { createEconomy } from '../sim/economy.ts';
import type { Economy } from '../sim/economy.ts';
import type { BuildingType, FactionId, Result, Team, UnitType } from '../types.ts';
import type { ClientMsg, EntityView, ServerMsg } from '../net/protocol.ts';
import type { PossessInput, Session, SessionUpdate, ViewWorld } from './session.ts';

const SMOOTH = 12; // 보간 속도 (1/s)
const CORRECT = 4; // 빙의 유닛 서버 보정 속도 (1/s)
const SNAP_DIST = 3; // 이 이상 어긋나면 즉시 서버 위치로
const INPUT_HZ = 20;
const MODES: OrderMode[] = ['hold', 'attack', 'move'];
const RADIUS = { small: 0.4, medium: 0.6, large: 0.8 } as const;

interface Tracked { e: Entity; tx: number; tz: number }

function makeEntity(v: EntityView): Entity {
  const f = FACTIONS[v.f];
  if (v.k === 'structure') {
    const d = f.buildings[v.ty as BuildingType];
    return {
      id: v.id, team: v.team, factionId: v.f, kind: 'structure', type: v.ty as BuildingType, name: d.name,
      size: 'large', radius: 2.5, maxHp: d.hp, maxShield: d.shield ?? 0, armor: d.armor, speed: 0, attack: null,
      supply: 0, x: v.x, z: v.z, hp: v.hp, shield: v.sh, cooldownLeft: 0,
      order: { mode: 'hold', x: v.x, z: v.z }, possessed: false,
    };
  }
  const d = f.units[v.ty as UnitType];
  return {
    id: v.id, team: v.team, factionId: v.f, kind: 'unit', type: v.ty as UnitType, name: d.name,
    size: d.size, radius: RADIUS[d.size], maxHp: d.hp, maxShield: d.shield, armor: d.armor, speed: d.speed,
    attack: d.attack ?? null, supply: d.supply, x: v.x, z: v.z, hp: v.hp, shield: v.sh, cooldownLeft: v.cd,
    order: { mode: MODES[v.m], x: v.x, z: v.z }, possessed: v.p,
  };
}

export class RemoteSession implements Session {
  readonly kind = 'multi';
  readonly canChangeSpeed = false;
  readonly nextWaveAt = null;
  readonly myFaction: FactionId;
  readonly enemyFaction: FactionId;
  readonly eco: Economy;
  readonly world: ViewWorld = { time: 0, entities: [], events: [], lastCombatAt: -999, lastCombatPos: { x: 0, z: 0 } };
  elapsed = 0;

  private tracked = new Map<number, Tracked>();
  private pendingEvents: CombatEvent[] = [];
  private notices: string[] = [];
  private over: SessionUpdate['over'] = null;
  private overReported = false;
  private possessedId: number | null = null;
  /** 서버가 확인한 빙의 유닛 */
  private serverPossessed: number | null = null;
  /** 빙의 요청 후 서버 확인까지 기다린 시간 */
  private possessWait = 0;
  private inputTimer = 0;
  private lastInput = '';

  constructor(private ws: WebSocket, readonly team: Team, factions: [FactionId, FactionId], readonly label: string) {
    this.myFaction = factions[team];
    this.enemyFaction = factions[team === 0 ? 1 : 0];
    this.eco = createEconomy(this.myFaction);
    ws.addEventListener('message', (ev) => this.onMessage(JSON.parse(String(ev.data)) as ServerMsg));
    ws.addEventListener('close', () => {
      if (!this.over) this.over = { won: false, reason: '서버와 연결이 끊어졌습니다' };
    });
  }

  private send(msg: ClientMsg): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private onMessage(msg: ServerMsg): void {
    switch (msg.t) {
      case 'state': this.applyState(msg); break;
      case 'rejected':
        if (msg.reason === '빙의할 수 없는 유닛') break; // update()에서 possessLost로 처리
        this.notices.push(msg.reason);
        break;
      case 'over': this.over = { won: msg.winner === this.team }; break;
      case 'opponentLeft': this.over = { won: true, reason: '상대가 게임을 나갔습니다' }; break;
      case 'error': this.notices.push(msg.reason); break;
      default: break;
    }
  }

  private applyState(s: Extract<ServerMsg, { t: 'state' }>): void {
    // 경제: 화면이 같은 객체를 참조하므로 제자리에서 갱신
    Object.assign(this.eco, s.eco);
    this.elapsed = s.elapsed;
    this.serverPossessed = s.possessed;
    this.world.time = s.time;
    this.world.lastCombatAt = s.lastCombatAt;
    this.world.lastCombatPos = { x: s.lastCombatX, z: s.lastCombatZ };

    const alive = new Set<number>();
    for (const v of s.entities) {
      alive.add(v.id);
      const t = this.tracked.get(v.id);
      if (!t) {
        this.tracked.set(v.id, { e: makeEntity(v), tx: v.x, tz: v.z });
        continue;
      }
      t.tx = v.x;
      t.tz = v.z;
      t.e.hp = v.hp;
      t.e.shield = v.sh;
      t.e.cooldownLeft = v.cd;
      t.e.order.mode = MODES[v.m];
      t.e.possessed = v.p;
    }
    for (const id of this.tracked.keys()) if (!alive.has(id)) this.tracked.delete(id);
    this.world.entities = [...this.tracked.values()].map((t) => t.e);
    this.pendingEvents.push(...s.events);
  }

  update(realDt: number, _speed: number, possess: PossessInput | null): SessionUpdate {
    // 스냅샷 사이에도 시간이 흐르도록
    this.world.time += realDt;
    this.elapsed += realDt;

    const k = Math.min(1, realDt * SMOOTH);
    for (const t of this.tracked.values()) {
      if (possess && t.e.id === possess.id) continue;
      t.e.x += (t.tx - t.e.x) * k;
      t.e.z += (t.tz - t.e.z) * k;
    }

    let fire: SessionUpdate['fire'] = null;
    if (possess) {
      const t = this.tracked.get(possess.id);
      if (t) {
        // 로컬 예측 이동 + 서버 위치로 보정
        const len = Math.hypot(possess.dx, possess.dz);
        if (len > 1e-3) {
          const s = Math.min(1, len) / len;
          t.e.x += possess.dx * s * t.e.speed * realDt;
          t.e.z += possess.dz * s * t.e.speed * realDt;
        }
        const err = Math.hypot(t.tx - t.e.x, t.tz - t.e.z);
        const c = err > SNAP_DIST ? 1 : Math.min(1, realDt * CORRECT);
        t.e.x += (t.tx - t.e.x) * c;
        t.e.z += (t.tz - t.e.z) * c;

        // 사거리 밖 피드백은 클라이언트에서 즉시 계산
        const aim = possess.aimId != null ? this.tracked.get(possess.aimId)?.e : undefined;
        if (possess.firing && aim && t.e.attack
            && Math.hypot(aim.x - t.e.x, aim.z - t.e.z) > t.e.attack.range + t.e.radius + aim.radius) {
          fire = 'out_of_range';
        }
      }
      this.sendInput(realDt, possess);
    }

    // 빙의 요청이 1초 넘게 서버에 반영되지 않으면 해제 (거부·사망 등)
    let possessLost = false;
    if (this.possessedId != null && this.serverPossessed !== this.possessedId) {
      this.possessWait += realDt;
      if (this.possessWait > 1) {
        possessLost = true;
        this.possessedId = null;
        this.possessWait = 0;
      }
    } else {
      this.possessWait = 0;
    }

    const events = this.pendingEvents;
    this.pendingEvents = [];
    if (possess && events.some((e) => e.type === 'shot' && e.from === possess.id)) fire = 'hit';
    this.world.events = events;

    const notices = this.notices;
    this.notices = [];
    let over: SessionUpdate['over'] = null;
    if (this.over && !this.overReported) {
      over = this.over;
      this.overReported = true;
    }
    return { events, over, notices, fire, possessLost };
  }

  private sendInput(dt: number, p: PossessInput): void {
    // 서버는 마지막 입력을 계속 적용하므로, 바뀔 때만 보내되 초당 INPUT_HZ회로 제한
    const key = `${p.dx.toFixed(2)},${p.dz.toFixed(2)},${p.firing},${p.aimId}`;
    this.inputTimer -= dt;
    if (key === this.lastInput || this.inputTimer > 0) return;
    this.inputTimer = 1 / INPUT_HZ;
    this.lastInput = key;
    this.send({ t: 'input', dx: p.dx, dz: p.dz, firing: p.firing, aim: p.aimId });
  }

  build(type: BuildingType): Result {
    this.send({ t: 'build', building: type });
    return { ok: true };
  }

  train(buildingId: number, unit: UnitType): Result {
    this.send({ t: 'train', buildingId, unit });
    return { ok: true };
  }

  moveWorker(to: 'ore' | 'gas'): boolean {
    this.send({ t: 'worker', to });
    return true;
  }

  orderTeam(mode: 'attack' | 'hold'): void { this.send({ t: 'orderTeam', mode }); }

  orderUnits(ids: number[], cmd: Command): void {
    if (cmd.mode === 'target') this.send({ t: 'order', ids, mode: 'target', targetId: cmd.targetId });
    else this.send({ t: 'order', ids, mode: cmd.mode, x: cmd.x, z: cmd.z });
  }

  setPossessed(_prevId: number | null, nextId: number | null): void {
    if (nextId === this.possessedId) return;
    this.possessedId = nextId;
    this.possessWait = 0;
    this.lastInput = '';
    this.send({ t: 'possess', id: nextId });
  }

  dispose(): void { this.ws.close(); }
}
