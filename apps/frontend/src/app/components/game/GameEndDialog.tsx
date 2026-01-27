import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">게임 종료</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          {gameEndData && (
            <>
              <div className="text-center">
                <p className="text-3xl font-bold mb-2">
                  {gameEndData.myRank === 1 ? '🎉 1등!' : `${gameEndData.myRank}등`}
                </p>
                <p className="text-gray-400 text-sm">
                  {gameEndData.reason === 'hand_empty' && '모든 카드를 소진했습니다'}
                  {gameEndData.reason === 'burst' && '파산했습니다'}
                  {gameEndData.reason === 'player_left' && '플레이어가 나갔습니다'}
                </p>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="text-center text-gray-300 text-sm">
                  {gameEndData.winnerId === sessionId 
                    ? '축하합니다! 승리하셨습니다!' 
                    : '다음 게임에서 더 좋은 성적을 거두세요!'}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
          >
            확인
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
