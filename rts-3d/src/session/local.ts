// 싱글 플레이: 경제·AI는 TypeScript, 전투는 Rust WASM으로 브라우저 안에서 실행
import { createEconomy, tickEconomy, queueBuilding, queueUnit, moveWorker, releaseUnit } from '../sim/economy.ts';
import type { Economy } from '../sim/economy.ts';
import {
  createWorld, destroyWorld, spawnStructure, spawnUnit, orderTeam, orderUnits, stepCombat,
  possessedMove, possessedFire, setPossessed, HQ_POS, RALLY_POS,
} from '../sim/combat.ts';
import type { Command, CombatEvent, World } from '../sim/combat.ts';
import { createAI, tickAI } from '../sim/ai.ts';
import type { AI } from '../sim/ai.ts';
import type { BuildingType, FactionId, Result, UnitType } from '../types.ts';
import type { FireFeedback, PossessInput, Session, SessionUpdate } from './session.ts';

const STEP = 1 / 30;

export class LocalSession implements Session {
  readonly kind = 'single';
  readonly team = 0;
  readonly canChangeSpeed = true;
  readonly label = 'vs AI';
  readonly eco: Economy;
  readonly world: World;
  elapsed = 0;
  private readonly enemyEco: Economy;
  private readonly ai: AI;
  private playerOrder: 'attack' | 'hold' = 'hold';
  private over = false;

  constructor(readonly myFaction: FactionId, readonly enemyFaction: FactionId) {
    this.eco = createEconomy(myFaction);
    this.enemyEco = createEconomy(enemyFaction);
    this.ai = createAI();
    this.world = createWorld();
    spawnStructure(this.world, 0, myFaction, 'hq');
    spawnStructure(this.world, 1, enemyFaction, 'hq');
  }

  get nextWaveAt(): number { return this.ai.nextWaveAt; }

  update(realDt: number, speed: number, possess: PossessInput | null): SessionUpdate {
    const result: SessionUpdate = { events: [], over: null, notices: [], fire: null };
    if (this.over) return result;
    const dt = realDt * speed;
    const { world } = this;
    this.elapsed += dt;

    for (const u of tickEconomy(this.eco, dt)) {
      const e = spawnUnit(world, 0, this.myFaction, u);
      const dest = this.playerOrder === 'attack' ? HQ_POS[1] : RALLY_POS[0];
      orderUnits(world, [e.id], { mode: this.playerOrder, ...dest });
    }
    for (const u of tickEconomy(this.enemyEco, dt)) spawnUnit(world, 1, this.enemyFaction, u);
    if (tickAI(this.ai, this.enemyEco, this.elapsed, dt) === 'attack') {
      orderTeam(world, 1, 'attack');
      result.notices.push(`⚠ 적 웨이브 ${this.ai.wave} 접근 중!`);
    }

    // 1인칭 빙의 유닛: 플레이어 입력으로 이동·사격
    const me = possess ? world.byId.get(possess.id) : undefined;
    if (possess && me) {
      possessedMove(world, me, possess.dx, possess.dz, dt);
      if (possess.firing) {
        const aim = possess.aimId != null ? world.byId.get(possess.aimId) ?? null : null;
        const r = possessedFire(world, me, aim);
        let fb: FireFeedback = null;
        if (r.ok) { result.events.push(r.event); fb = 'hit'; } else if (r.reason !== 'cooldown') fb = r.reason;
        result.fire = fb;
      }
    }

    // 고정 스텝 전투
    let remaining = dt;
    while (remaining > 0 && !this.over) {
      const step = Math.min(remaining, STEP);
      remaining -= step;
      for (const ev of stepCombat(world, step)) {
        result.events.push(ev);
        if (ev.type !== 'death') continue;
        if (ev.kind === 'structure') {
          this.over = true;
          result.over = { won: ev.team === 1 };
        } else {
          releaseUnit(ev.team === 0 ? this.eco : this.enemyEco, ev.supply);
        }
      }
    }
    world.events = result.events as CombatEvent[];
    return result;
  }

  build(type: BuildingType): Result { return queueBuilding(this.eco, type); }
  train(buildingId: number, unit: UnitType): Result { return queueUnit(this.eco, buildingId, unit); }
  moveWorker(to: 'ore' | 'gas'): boolean { return moveWorker(this.eco, to); }

  orderTeam(mode: 'attack' | 'hold'): void {
    this.playerOrder = mode;
    orderTeam(this.world, 0, mode);
  }

  orderUnits(ids: number[], cmd: Command): void { orderUnits(this.world, ids, cmd); }

  setPossessed(prevId: number | null, nextId: number | null): void {
    if (prevId != null && this.world.byId.has(prevId)) {
      setPossessed(this.world, prevId, false);
      orderUnits(this.world, [prevId], { mode: 'hold' }); // 빙의 해제 후 그 자리 방어
    }
    if (nextId != null && this.world.byId.has(nextId)) setPossessed(this.world, nextId, true);
  }

  dispose(): void { destroyWorld(this.world); }
}
