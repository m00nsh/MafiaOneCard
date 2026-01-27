import { OpponentPlayer } from '@/app/components/game/OpponentProfile';
import { CHARACTER_SKILLS, CharacterId, PlayerInfo } from '@mafia/shared';
import { generateMockOpponents } from './opponentUtils';

/**
 * 서버에서 받은 플레이어 정보를 Opponent 형식으로 변환
 * 시계 방향으로 턴 순서대로 배치: 플레이어 수에 따라 위치 결정
 */
export function transformPlayersToOpponents(
  gameStatePlayers: Map<string, PlayerInfo> | undefined,
  myId: string,
  initialPlayerCount: number
): OpponentPlayer[] {
  if (!gameStatePlayers) {
    return generateMockOpponents(initialPlayerCount);
  }

  const allPlayerIds = Array.from(gameStatePlayers.keys());
  const myIndex = allPlayerIds.indexOf(myId);
  const opponentCount = allPlayerIds.length - 1; // 내 자신 제외
  
  // 내 자신을 기준으로 시계 방향 순서 생성
  const orderedOpponentIds: string[] = [];
  for (let i = 1; i < allPlayerIds.length; i++) {
    const nextIndex = (myIndex + i) % allPlayerIds.length;
    orderedOpponentIds.push(allPlayerIds[nextIndex]);
  }

  // 플레이어 수에 따른 위치 배치
  const positions: OpponentPlayer['position'][] = [];
  if (opponentCount === 1) {
    positions.push('left-top');
  } else if (opponentCount === 2) {
    positions.push('left-top', 'right-top');
  } else if (opponentCount === 3) {
    positions.push('left-top', 'left-bottom', 'right-top');
  } else {
    // 4명 이상
    positions.push('left-top', 'left-bottom', 'right-top', 'right-bottom');
  }

  return orderedOpponentIds.map((id, index) => {
    const playerInfo = gameStatePlayers.get(id);
    if (!playerInfo) return null;
    
    // 캐릭터 이름 가져오기
    const characterId = playerInfo.characterId as CharacterId | undefined;
    const characterName = characterId && CHARACTER_SKILLS[characterId] 
      ? CHARACTER_SKILLS[characterId].name 
      : '캐릭터';
    
    return {
      id,
      name: playerInfo.nickname || `Player ${index + 1}`,
      character: characterName,
      cardCount: playerInfo.handCount || 0,
      position: positions[index] || 'left-top',
    };
  }).filter((p): p is OpponentPlayer => p !== null);
}
