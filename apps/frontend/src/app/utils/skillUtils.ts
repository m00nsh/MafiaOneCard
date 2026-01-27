import { CharacterId, CHARACTER_SKILLS } from '@mafia/shared';

/**
 * 스킬 사용 가능 여부 확인
 */
export function canUseSkill(
  characterId: CharacterId | null,
  skillProgress: number,
  skillMaxCooldown: number,
  skillUsesLeft: number,
  attackStack: number,
  isMyTurn: boolean,
  isPlaying: boolean
): boolean {
  if (!isPlaying || !isMyTurn) return false;
  if (!characterId) return false;

  const skillInfo = CHARACTER_SKILLS[characterId];
  if (!skillInfo) return false;

  // 탱커 스킬: 공격 스택이 있을 때만 사용 가능
  if (characterId === 'tank') {
    return attackStack > 0;
  }

  // 쿨타임 기반 스킬 (cooldown > 0)
  if (skillInfo.cooldown > 0) {
    return skillProgress >= skillMaxCooldown;
  }

  // 사용 횟수 기반 스킬 (cooldown === 0)
  return skillUsesLeft > 0;
}

/**
 * 스킬별 필요한 입력값 확인
 */
export interface SkillRequiredInputs {
  needsTarget: boolean;
  needsCard: boolean;
  needsSuit: boolean;
  targetCount: number; // 대상 플레이어 수 (광전사는 2명, 2인 플레이에서는 1명)
}

export function getSkillRequiredInputs(
  characterId: CharacterId | null,
  playerCount: number
): SkillRequiredInputs {
  if (!characterId) {
    return { needsTarget: false, needsCard: false, needsSuit: false, targetCount: 0 };
  }

  switch (characterId) {
    case 'merchant': // 잡상인
      return { needsTarget: true, needsCard: true, needsSuit: false, targetCount: 1 };
    
    case 'tank': // 탱커
      return { needsTarget: false, needsCard: false, needsSuit: false, targetCount: 0 };
    
    case 'thief': // 도둑
      return { needsTarget: false, needsCard: false, needsSuit: false, targetCount: 0 };
    
    case 'prophet': // 예언자
      return { needsTarget: false, needsCard: false, needsSuit: false, targetCount: 0 };
    
    case 'shaman': // 주술사
      return { needsTarget: true, needsCard: false, needsSuit: false, targetCount: 1 };
    
    case 'summoner': // 소환사
      return { needsTarget: true, needsCard: false, needsSuit: false, targetCount: 1 };
    
    case 'assassin': // 암살자
      return { needsTarget: true, needsCard: false, needsSuit: false, targetCount: 1 };
    
    case 'berserker': // 광전사
      // 2인 플레이에서는 1명, 그 외에는 2명
      return { needsTarget: true, needsCard: false, needsSuit: false, targetCount: playerCount === 2 ? 1 : 2 };
    
    default:
      return { needsTarget: false, needsCard: false, needsSuit: false, targetCount: 0 };
  }
}

/**
 * 스킬 설명 반환
 */
export function getSkillDescription(characterId: CharacterId | null): string {
  if (!characterId) return '';
  return CHARACTER_SKILLS[characterId]?.description || '';
}
