interface LobbyUIProps {
  currentPlayerCount: number;
  allPlayersReady: boolean;
  readyCount: number;
  myReadyState: boolean;
  canStartGame: boolean;
  onToggleReady: () => void;
}

/**
 * 로비 상태 UI 컴포넌트
 */
export default function LobbyUI({
  currentPlayerCount,
  allPlayersReady,
  readyCount,
  myReadyState,
  canStartGame,
  onToggleReady,
}: LobbyUIProps) {
  return (
    <>
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        <div className="bg-black/70 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm">
          <p className="text-sm mb-2">플레이어 수: {currentPlayerCount}명</p>
          <p className="text-sm">
            {allPlayersReady 
              ? `✅ 모든 플레이어 준비 완료! (최소 2명 필요)`
              : `⏳ 준비 중... (${readyCount}/${currentPlayerCount})`}
          </p>
        </div>
        <button
          onClick={onToggleReady}
          className={`px-8 py-3 text-lg font-bold rounded-lg transition-all shadow-lg ${
            myReadyState
              ? 'bg-green-600 hover:bg-green-500 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1'
              : 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
          }`}
        >
          {myReadyState ? '✅ 준비 완료' : '⏳ 준비하기'}
        </button>
      </div>

      {/* 게임 시작 대기 메시지 */}
      {canStartGame && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-6 py-2 rounded-lg shadow-xl backdrop-blur-sm animate-pulse">
          <p className="text-sm font-bold">게임이 곧 시작됩니다...</p>
        </div>
      )}
    </>
  );
}
