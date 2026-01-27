import PlayingCard from '@/app/components/PlayingCard';
import { Card } from '@/app/utils/gameLogic';

interface CenterAreaProps {
  deckCount: number;
  topCard: Card;
  attackStack: number;
  isMyTurn: boolean;
  onDrawCard: () => void;
}

/**
 * 중앙 영역 (덱과 바닥 카드) 컴포넌트
 */
export default function CenterArea({
  deckCount,
  topCard,
  attackStack,
  isMyTurn,
  onDrawCard,
}: CenterAreaProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
      {/* Deck (Face Down) */}
      <div
        onClick={onDrawCard}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDrawCard()}
        className={`cursor-pointer flex flex-col items-center gap-2 transition-all duration-300 rounded-lg p-2
          ${isMyTurn ? 'border-2 border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-2 border-transparent'}
          ${!isMyTurn ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105'}
        `}
      >
        <PlayingCard
          card={{ id: 'deck-top', suit: 'joker', rank: 'JOKER_BW' }}
          faceDown={true}
          className="hover:scale-105 transition-transform"
          style={{ width: '7rem' }}
        />
        <div className="text-center text-white font-bold bg-black/50 rounded-full px-3 py-1">
          남은 카드: {deckCount}
        </div>
      </div>

      {/* Top Card (Discard) */}
      <div className="relative flex flex-col items-center gap-2">
        <PlayingCard 
          card={topCard} 
          style={{ width: '7rem' }}
        />
        {attackStack > 0 ? (
          <div className="text-center text-white font-bold bg-red-600 rounded-full px-3 py-1 shadow-lg">
            누적 공격: {attackStack}
          </div>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </div>
  );
}
