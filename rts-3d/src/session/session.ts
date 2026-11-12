// 게임 세션 인터페이스: 화면(UI)은 싱글/멀티를 구분하지 않고 이 인터페이스만 사용한다.
//  - LocalSession: 브라우저 안에서 경제·AI·전투(WASM)를 모두 실행 (싱글 플레이)
//  - RemoteSession: Rust 서버가 계산한 결과를 받아 표시하고, 명령만 전송 (멀티 플레이)
import type { Command, CombatEvent, Entity } from '../sim/combat.ts';
import type { Economy } from '../sim/economy.ts';
import type { BuildingType, FactionId, Result, Team, UnitType } from '../types.ts';

/** 화면이 읽는 전투 상태 (sim/combat.ts의 World와 호환) */
export interface ViewWorld {
  time: number;
  entities: Entity[];
  events: CombatEvent[];
  lastCombatAt: number;
  lastCombatPos: { x: number; z: number };
}

/** 1인칭 빙의 유닛 입력 (월드 기준 방향) */
export interface PossessInput {
  id: number;
  dx: number;
  dz: number;
  firing: boolean;
  aimId: number | null;
}

export type FireFeedback = 'hit' | 'out_of_range' | 'no_target' | null;

export interface SessionUpdate {
  /** 이번 프레임의 전투 이벤트 */
  events: CombatEvent[];
  /** 게임 종료 */
  over: { won: boolean; reason?: string } | null;
  /** 화면에 띄울 알림 (적 웨이브, 명령 거부 등) */
  notices: string[];
  fire: FireFeedback;
  /** 서버가 빙의를 받아들이지 않음 (유닛이 이미 죽었거나 거부됨) → 화면도 빙의 해제 */
  possessLost?: boolean;
}

export interface Session {
  readonly kind: 'single' | 'multi';
  readonly team: Team;
  readonly myFaction: FactionId;
  readonly enemyFaction: FactionId;
  readonly eco: Economy;
  readonly world: ViewWorld;
  readonly elapsed: number;
  /** 다음 AI 웨이브 시각 (싱글만) */
  readonly nextWaveAt: number | null;
  /** 게임 속도 변경 가능 여부 (멀티는 1배 고정) */
  readonly canChangeSpeed: boolean;
  /** 방 코드 등 부가 정보 */
  readonly label: string;

  update(realDt: number, speed: number, possess: PossessInput | null): SessionUpdate;

  build(type: BuildingType): Result;
  train(buildingId: number, unit: UnitType): Result;
  moveWorker(to: 'ore' | 'gas'): boolean;
  orderTeam(mode: 'attack' | 'hold'): void;
  orderUnits(ids: number[], cmd: Command): void;
  setPossessed(prevId: number | null, nextId: number | null): void;
  dispose(): void;
}

/** 큐가 가장 짧은 생산 건물 (빠른 생산용) */
export function bestProducer(eco: Economy, produces: (type: BuildingType) => UnitType[] | undefined, unit: UnitType) {
  return eco.buildings
    .filter((b) => b.done && produces(b.type)?.includes(unit))
    .sort((a, b) => a.queue.length - b.queue.length)[0];
}
