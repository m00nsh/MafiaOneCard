import GameModal, { GameModalHeader, GameModalTitle, GameModalFooter } from './GameModal';

interface GameEndData {
  myRank: number;
  winnerId: string;
  reason: string;
}

interface GameEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameEndData: GameEndData | null;
  sessionId: string | null;
  onConfirm: () => void;
}

/**
 * 게임 종료 시 통계를 표시하는 다이얼로그
 */
export default function GameEndDialog({ 
  open, 
  onOpenChange, 
  gameEndData, 
  sessionId,
  onConfirm 
}: GameEndDialogProps) {
  return (
    <GameModal open={open} onClose={() => onOpenChange(false)} width={500}>
      <GameModalHeader>
        <GameModalTitle className="text-[28px] text-center">게임 종료</GameModalTitle>
      </GameModalHeader>
      
      <div className="py-6 space-y-5">
        {gameEndData && (
          <>
            <div className="text-center">
              <p className="text-[40px] font-bold mb-3 text-amber-900 dark:text-amber-100">
                {gameEndData.myRank === 1 ? '🎉 1등!' : `${gameEndData.myRank}등`}
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-[16px]">
                {gameEndData.reason === 'hand_empty' && '모든 카드를 소진했습니다'}
                {gameEndData.reason === 'burst' && '파산했습니다'}
                {gameEndData.reason === 'player_left' && '플레이어가 나갔습니다'}
              </p>
            </div>
            <div className="border-t border-amber-300 dark:border-amber-600 pt-5">
              <p className="text-center text-amber-800 dark:text-amber-200 text-[16px]">
                {gameEndData.winnerId === sessionId 
                  ? '축하합니다! 승리하셨습니다!' 
                  : '다음 게임에서 더 좋은 성적을 거두세요!'}
              </p>
            </div>
          </>
        )}
      </div>
      
      <GameModalFooter className="justify-center">
        <button
          onClick={onConfirm}
          className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-3 rounded-lg text-[18px] font-bold transition-colors"
        >
          확인
        </button>
      </GameModalFooter>
    </GameModal>
  );
}
