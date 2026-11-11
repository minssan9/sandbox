// 공통 전투 규칙: 공격 타입 × 유닛 크기 배율
import type { DamageType, Size } from '../types.ts';

export const DAMAGE_TABLE: Record<DamageType, Record<Size, number>> = {
  kinetic:   { small: 1.0, medium: 1.0, large: 1.0 },
  explosive: { small: 0.5, medium: 0.75, large: 1.0 },
  plasma:    { small: 1.0, medium: 0.5, large: 0.25 },
};

export const MIN_DAMAGE = 0.5;

/**
 * 피해 계산: 실드는 배율/방어력 무시하고 먼저 소모, 남은 피해에 타입 배율과 방어력 적용
 * @returns {{ shield: number, hp: number }} 새 실드/체력
 */
export interface Damageable { hp: number; shield?: number; armor?: number; size: Size }

export function applyDamage(target: Damageable, rawDamage: number, damageType: DamageType): { shield: number; hp: number } {
  let shield = target.shield ?? 0;
  let hp = target.hp;
  let remaining = rawDamage;

  if (shield > 0) {
    const absorbed = Math.min(shield, remaining);
    shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    const mult = DAMAGE_TABLE[damageType][target.size];
    const dealt = Math.max(MIN_DAMAGE, remaining * mult - (target.armor ?? 0));
    hp -= dealt;
  }
  return { shield, hp };
}
