import { useState, useEffect } from 'react';

interface TurnTimerProps {
  timerEndTime: number; // Unix timestamp (milliseconds)
  isMyTurn: boolean;
}

/**
 * 턴 타이머를 표시하는 컴포넌트
 * 남은 시간을 초 단위로 표시하고, 시간이 부족하면 경고 색상으로 표시
 */
export default function TurnTimer({ timerEndTime, isMyTurn }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!timerEndTime || timerEndTime === 0) {
      setTimeLeft(0);
      return;
    }

    // 즉시 계산
    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTime();

    // 1초마다 업데이트
    const interval = setInterval(updateTime, 100);

    return () => clearInterval(interval);
  }, [timerEndTime]);

  // 타이머가 없거나 게임이 진행 중이 아니면 표시하지 않음
  if (!timerEndTime || timerEndTime === 0 || timeLeft <= 0) {
    return null;
  }

  // 내 턴이 아니면 표시하지 않음 (또는 다른 스타일로 표시할 수도 있음)
  // if (!isMyTurn) {
  //   return null;
  // }

  const isWarning = timeLeft <= 3; // 3초 이하면 경고
  const isCritical = timeLeft <= 1; // 1초 이하면 위험

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div
        className={`px-6 py-3 rounded-full shadow-2xl backdrop-blur-sm border-2 transition-all ${
          isCritical
            ? 'bg-red-500/90 border-red-300 text-white animate-pulse'
            : isWarning
            ? 'bg-amber-500/90 border-amber-300 text-white'
            : 'bg-blue-500/90 border-blue-300 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* 타이머 아이콘 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isCritical ? 'animate-spin' : ''}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>

          {/* 남은 시간 */}
          <span className="font-bold text-2xl tabular-nums min-w-[60px] text-center">
            {timeLeft}초
          </span>

          {/* 진행 바 (선택적) */}
          <div className="w-24 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isCritical
                  ? 'bg-red-200'
                  : isWarning
                  ? 'bg-amber-200'
                  : 'bg-white'
              }`}
              style={{ width: `${Math.min(100, (timeLeft / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
