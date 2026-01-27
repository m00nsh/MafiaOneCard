import { OpponentPlayer } from '@/app/components/game/OpponentProfile';

/**
 * 플레이어 수에 따라 Mock 상대방 목록을 생성하는 유틸리티
 */
export function generateMockOpponents(totalPlayers: number): OpponentPlayer[] {
  const opponents: OpponentPlayer[] = [];

  // Distribution logic based on user request:
  // 2 Players (1 Opp): Left
  // 3 Players (2 Opp): Left, Right
  // 4 Players (3 Opp): Left (2), Right (1)
  // 5 Players (4 Opp): Left (2), Right (2) - Standard fallback

  const positions: OpponentPlayer['position'][] = [];
  if (totalPlayers === 2) {
    positions.push('left-top');
  } else if (totalPlayers === 3) {
    positions.push('left-top', 'right-top');
  } else if (totalPlayers === 4) {
    positions.push('left-top', 'left-bottom', 'right-top');
  } else {
    // 5+ Players (Default to 5 max)
    positions.push('left-top', 'left-bottom', 'right-top', 'right-bottom');
  }

  positions.forEach((pos, index) => {
    opponents.push({
      id: `op${index + 1}`,
      name: `Player ${index + 1}`,
      character: '캐릭터', // Placeholder
      cardCount: 5 + index, // Varied card counts
      position: pos
    });
  });

  return opponents;
}
