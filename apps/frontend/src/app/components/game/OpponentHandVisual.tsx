import PlayingCard from '@/app/components/PlayingCard';

interface OpponentHandVisualProps {
  count: number;
  isLeft: boolean;
}

/**
 * 상대방의 손패를 시각적으로 표시하는 컴포넌트
 * 10장을 초과하면 "+X" 표기로 변경
 */
export default function OpponentHandVisual({ count, isLeft }: OpponentHandVisualProps) {
  const VISUAL_CAP = 10;
  const renderCount = Math.min(count, VISUAL_CAP);
  const OFFSET_PX = 12; // Card spacing

  return (
    <div className="relative w-20 h-28" style={{ width: `calc(5rem + ${(renderCount - 1) * OFFSET_PX}px)` }}>
      {Array.from({ length: renderCount }).map((_, index) => {
        // Stack logic: Corner-side card is on top (index 0)
        // Left side: Index 0 is at left:0. Index 1 at left:offset. Z-index decreases.
        // Right side: Index 0 is at right:0. Index 1 at right:offset. Z-index decreases.
        const style: React.CSSProperties = isLeft
          ? {
            left: `${index * OFFSET_PX}px`,
            zIndex: renderCount - index,
          }
          : {
            right: `${index * OFFSET_PX}px`,
            zIndex: renderCount - index,
          };

        return (
          <div
            key={index}
            className="absolute top-0 w-20 h-28 transition-all duration-300"
            style={style}
          >
            <PlayingCard
              card={{ id: `opp-card-${index}`, suit: 'joker', rank: 'JOKER_BW' }}
              faceDown={true}
              className="w-full h-full shadow-md"
            />
          </div>
        );
      })}
      {/* Show count badge if more than 10 cards */}
      {count > VISUAL_CAP && (
        <div
          className={`absolute -bottom-2 ${isLeft ? 'right-0' : 'left-0'} bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-50 font-bold`}
        >
          +{count - VISUAL_CAP}
        </div>
      )}
    </div>
  );
}
