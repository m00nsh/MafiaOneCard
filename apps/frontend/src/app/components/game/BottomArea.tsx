import PlayingCard from '@/app/components/PlayingCard';
import { Card } from '@/app/utils/gameLogic';

interface BottomAreaProps {
  nickname: string;
  characterName: string;
  cardCount: number;
  sortedHand: Card[];
  sortMode: 'none' | 'suit' | 'rank';
  onToggleSort: () => void;
  onPlayCard: (index: number) => void;
  isCardPlayable: (card: Card, index: number) => boolean;
  maxSkillCooldown: number;
  currentSkillCharge: number;
  isMyTurn: boolean;
  onSkillClick: () => void;
}

/**
 * 하단 영역 (내 정보, 손패, 스킬 버튼) 컴포넌트
 */
export default function BottomArea({
  nickname,
  characterName,
  cardCount,
  sortedHand,
  sortMode,
  onToggleSort,
  onPlayCard,
  isCardPlayable,
  maxSkillCooldown,
  currentSkillCharge,
  isMyTurn,
  onSkillClick,
}: BottomAreaProps) {
  // Dynamic Hand Spacing Logic
  const calculateOverlap = () => {
    const CARD_WIDTH = 112; // 7rem = 112px
    const CONTAINER_MAX_WIDTH = 760;

    if (sortedHand.length <= 1) return 0;

    const STANDARD_OVERLAP = 56;
    const standardTotalWithOverlap = CARD_WIDTH + (sortedHand.length - 1) * (CARD_WIDTH - STANDARD_OVERLAP);

    if (standardTotalWithOverlap <= CONTAINER_MAX_WIDTH) {
      return STANDARD_OVERLAP;
    }

    const requiredOverlap = CARD_WIDTH - ((CONTAINER_MAX_WIDTH - CARD_WIDTH) / (sortedHand.length - 1));
    return Math.max(0, requiredOverlap);
  };

  const overlapPx = calculateOverlap();
  const isSkillReady = isMyTurn && currentSkillCharge >= maxSkillCooldown;

  return (
    <div className="w-full flex items-end justify-between gap-4 mt-auto mb-2 relative">
      {/* 내 정보 표시 (Left) */}
      <div className="flex flex-col justify-end w-[160px] shrink-0 gap-2">
        <div className="bg-gray-300 rounded-lg p-4 min-w-[140px] sm:min-w-[160px] shadow-lg">
          <p className="text-gray-900 font-bold text-lg sm:text-xl truncate">{nickname || 'Player'}</p>
          <p className="text-gray-600 text-sm sm:text-base">{`{${characterName}}`}</p>
          <p className="text-blue-600 font-bold mt-1">카드: {cardCount}장</p>
        </div>
        <button
          onClick={onToggleSort}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition-transform hover:scale-105 w-full whitespace-nowrap"
        >
          {sortMode === 'none' && 'Sort: Off'}
          {sortMode === 'suit' && 'Sort: Suit'}
          {sortMode === 'rank' && 'Sort: Rank'}
        </button>
      </div>

      {/* Hand Cards (Center) */}
      <div className="flex-1 flex justify-center items-end transition-all duration-300 pb-4 max-w-[760px] mx-auto min-h-[120px]">
        {sortedHand.map((card, index) => {
          const isPlayable = isCardPlayable(card, index);
          
          return (
            <div
              key={card.id || index}
              className="relative transition-all duration-300 hover:-translate-y-6 hover:z-50"
              style={{
                marginLeft: index === 0 ? 0 : `-${overlapPx}px`,
                zIndex: index
              }}
            >
              <PlayingCard
                card={card}
                isPlayable={isPlayable}
                onClick={() => isPlayable && onPlayCard(index)}
                className="shadow-2xl"
                style={{ width: '7rem' }}
              />
            </div>
          );
        })}
      </div>

      {/* Skill Button (Right) */}
      <div className="flex flex-col gap-2 items-end min-w-[120px] shrink-0">
        <button
          onClick={onSkillClick}
          className={`px-6 py-8 rounded-xl text-xl font-bold shadow-lg transition-all w-full whitespace-nowrap
            ${isSkillReady
              ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 cursor-pointer'
              : 'bg-gray-600/50 text-gray-400 cursor-not-allowed grayscale'
            }
          `}
        >
          능력 사용하기
        </button>
        <div className="bg-black/40 rounded-lg h-6 w-full overflow-hidden border border-white/30 flex">
          {Array.from({ length: maxSkillCooldown }).map((_, i) => {
            const isFilled = i < currentSkillCharge;
            return (
              <div
                key={i}
                className={`flex-1 ${isFilled ? 'bg-blue-500' : 'bg-transparent'} ${
                  i < maxSkillCooldown - 1 ? 'border-r border-white/30 border-dotted' : ''
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
