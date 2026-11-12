// 오리지널 3종족 데이터. 구조는 장르 공통(HP/실드/방어력/공격 타입/사거리/인구수), 수치는 자체 설계.
// 원본은 shared/factions.json — TypeScript 클라이언트와 Rust 서버가 같은 파일을 읽는다.
// trait: 'repair' 건물 수리 | 'regen' 체력 재생 | 'shield' 실드 재생 (재생 수치는 combat-core/src/world.rs)
import data from '../../shared/factions.json' with { type: 'json' };
import type { Faction, FactionId } from '../types.ts';

export const FACTIONS = data as Record<FactionId, Faction>;
export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];
