import OpponentHandVisual from './OpponentHandVisual';

export interface OpponentPlayer {
  id: string;
  name: string;
  character: string;
  cardCount: number;
  position: 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
}

interface OpponentProfileProps {
  player: OpponentPlayer;
  isTurn: boolean;
}

/**
 * 상대방 플레이어 정보를 표시하는 컴포넌트
 */
export default function OpponentProfile({ player, isTurn }: OpponentProfileProps) {
  const isLeft = player.position.includes('left');

  return (
    <div className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Info Box */}
      <div className={`bg-gray-300 rounded-lg p-4 min-w-[140px] sm:min-w-[160px] shadow-lg relative z-[100] transition-all duration-300
        ${isTurn ? 'border-4 border-yellow-400 scale-105' : ''}
        ${!isLeft ? 'text-right' : ''}
      `}>
        <p className="text-gray-900 font-bold text-lg sm:text-xl truncate">{player.name}</p>
        <p className="text-gray-600 text-sm sm:text-base">{`{${player.character}}`}</p>
        <p className="text-blue-600 font-bold mt-1">카드: {player.cardCount}장</p>
      </div>

      {/* Card Deck Visual */}
      <OpponentHandVisual count={player.cardCount} isLeft={isLeft} />
    </div>
  );
}
