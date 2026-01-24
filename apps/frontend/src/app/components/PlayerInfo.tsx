interface PlayerInfoProps {
  playerName: string;
  characterName: string;
  cardCount: number;
  isCurrentTurn: boolean;
  position: 'top-left' | 'top-center-left' | 'top-center-right' | 'top-right' | 'bottom-left' | 'bottom-right';
  showCardCount?: boolean;
}

export default function PlayerInfo({
  playerName,
  characterName,
  cardCount,
  isCurrentTurn,
  position,
  showCardCount = true,
}: PlayerInfoProps) {
  const positionClasses = {
    'top-left': 'absolute top-2 sm:top-4 left-2 sm:left-4',
    'top-center-left': 'absolute top-20 sm:top-24 left-2 sm:left-4',
    'top-center-right': 'absolute top-20 sm:top-24 right-2 sm:right-4',
    'top-right': 'absolute top-2 sm:top-4 right-2 sm:right-4',
    'bottom-left': 'absolute bottom-28 sm:bottom-32 left-2 sm:left-4',
    'bottom-right': 'absolute bottom-28 sm:bottom-32 right-2 sm:right-4',
  };

  return (
    <div
      className={`${positionClasses[position]} ${
        isCurrentTurn ? 'ring-2 sm:ring-4 ring-yellow-400' : ''
      } bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-xl min-w-[160px] sm:min-w-[200px]`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">{playerName}</p>
          <p className="text-xs sm:text-sm text-gray-600 truncate">({characterName})</p>
          {showCardCount && (
            <p className="text-xs sm:text-sm font-medium text-blue-600 mt-0.5 sm:mt-1">카드: {cardCount}장</p>
          )}
        </div>
        
        {/* Card backs - stacked cards */}
        {showCardCount && (
          <div className="relative h-10 w-12 sm:h-12 sm:w-16 flex-shrink-0">
            {[...Array(Math.min(cardCount, 5))].map((_, i) => (
              <div
                key={i}
                className="absolute h-10 w-8 sm:h-12 sm:w-10 bg-gradient-to-br from-blue-700 via-purple-600 to-blue-800 border-2 border-white rounded shadow-md"
                style={{
                  left: `${i * 2}px`,
                  zIndex: i,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-5 h-6 sm:w-6 sm:h-8 border-2 border-white/30 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}