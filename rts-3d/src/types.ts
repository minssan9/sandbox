// 게임 전역 타입 정의

export type FactionId = 'coalition' | 'swarm' | 'ascendant';
export type Team = 0 | 1;
export type Size = 'small' | 'medium' | 'large';
export type DamageType = 'kinetic' | 'explosive' | 'plasma';
export type UnitType = 'worker' | 'infantry' | 'ranged';
export type BuildingType = 'hq' | 'supply' | 'gas' | 'factory';
export type Trait = 'repair' | 'regen' | 'shield';

export interface Cost { ore: number; gas: number }

export interface AttackDef {
  damage: number;
  type: DamageType;
  cooldown: number;
  range: number;
}

export interface UnitDef {
  name: string;
  hp: number;
  shield: number;
  armor: number;
  size: Size;
  speed: number;
  supply: number;
  cost: Cost;
  buildTime: number;
  attack?: AttackDef;
}

export interface BuildingDef {
  name: string;
  hp: number;
  shield?: number;
  armor: number;
  cost: Cost;
  buildTime: number;
  supply?: number;
  produces?: UnitType[];
}

export interface Faction {
  id: FactionId;
  name: string;
  desc: string;
  color: string;
  trait: Trait;
  workerIncome: { ore: number; gas: number };
  buildings: Record<BuildingType, BuildingDef>;
  units: Record<UnitType, UnitDef>;
}

export type Result = { ok: true } | { ok: false; reason: string };
