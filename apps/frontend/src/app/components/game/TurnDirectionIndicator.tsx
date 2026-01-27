interface TurnDirectionIndicatorProps {
  direction: 'clockwise' | 'counter-clockwise';
}

/**
 * 게임 진행 방향을 시각적으로 표시하는 컴포넌트
 */
export default function TurnDirectionIndicator({ direction }: TurnDirectionIndicatorProps) {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10 pointer-events-none">
      {/* Left Arrow */}
      <div className={`transition-opacity duration-500 ${direction === 'counter-clockwise' ? 'opacity-100' : 'opacity-30'}`}>
        <svg
          width="60"
          height="20"
          viewBox="0 0 60 20"
          className={`overflow-visible ${direction === 'counter-clockwise' ? 'animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
        >
          <path
            d="M 58 18 Q 30 -5 2 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
          <path
            d="M 2 18 L 10 12 M 2 18 L 12 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center">
        <span className="text-white font-bold text-2xl tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          TURN
        </span>
      </div>

      {/* Right Arrow */}
      <div className={`transition-opacity duration-500 ${direction === 'clockwise' ? 'opacity-100' : 'opacity-30'}`}>
        <svg
          width="60"
          height="20"
          viewBox="0 0 60 20"
          className={`overflow-visible ${direction === 'clockwise' ? 'animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
        >
          <path
            d="M 2 18 Q 30 -5 58 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
          <path
            d="M 58 18 L 50 12 M 58 18 L 48 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
        </svg>
      </div>
    </div>
  );
}
