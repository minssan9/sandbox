// 클라이언트 ↔ 서버 WebSocket 메시지. server/src/protocol.rs와 일치해야 한다.
import type { CombatEvent } from '../sim/combat.ts';
import type { Economy } from '../sim/economy.ts';
import type { BuildingType, FactionId, Team, UnitType } from '../types.ts';

export type ClientMsg =
  | { t: 'create'; faction: FactionId }
  | { t: 'join'; code: string; faction: FactionId }
  | { t: 'build'; building: BuildingType }
  | { t: 'train'; buildingId: number; unit: UnitType }
  | { t: 'worker'; to: 'ore' | 'gas' }
  | { t: 'orderTeam'; mode: 'attack' | 'hold' }
  | { t: 'order'; ids: number[]; mode: 'hold' | 'attack' | 'move' | 'target'; x?: number; z?: number; targetId?: number }
  | { t: 'possess'; id: number | null }
  | { t: 'input'; dx: number; dz: number; firing: boolean; aim: number | null };

export interface EntityView {
  id: number;
  team: Team;
  f: FactionId;
  k: 'unit' | 'structure';
  ty: string;
  x: number;
  z: number;
  hp: number;
  sh: number;
  cd: number;
  /** 0 hold / 1 attack / 2 move */
  m: 0 | 1 | 2;
  p: boolean;
}

export type ServerMsg =
  | { t: 'room'; code: string; team: Team }
  | { t: 'start'; team: Team; factions: [FactionId, FactionId] }
  | {
      t: 'state';
      time: number;
      elapsed: number;
      lastCombatAt: number;
      lastCombatX: number;
      lastCombatZ: number;
      eco: Economy;
      entities: EntityView[];
      events: CombatEvent[];
      possessed: number | null;
    }
  | { t: 'rejected'; reason: string }
  | { t: 'over'; winner: Team }
  | { t: 'opponentLeft' }
  | { t: 'error'; reason: string };

export function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}
