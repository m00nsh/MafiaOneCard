import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { CardSuit } from '@mafia/shared';

interface SuitSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (suit: CardSuit) => void;
}

/**
 * 7 카드 사용 시 문양을 선택하는 다이얼로그
 */
export default function SuitSelectDialog({ open, onOpenChange, onSelect }: SuitSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>문양 선택</DialogTitle>
          <DialogDescription>
            7 카드를 사용했습니다. 변경할 문양을 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <button
            onClick={() => onSelect('SPADE')}
            className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
          >
            <div className="text-4xl">♠</div>
            <span className="text-sm font-semibold">스페이드</span>
          </button>
          <button
            onClick={() => onSelect('HEART')}
            className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
          >
            <div className="text-4xl text-red-600">♥</div>
            <span className="text-sm font-semibold">하트</span>
          </button>
          <button
            onClick={() => onSelect('DIAMOND')}
            className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
          >
            <div className="text-4xl text-red-600">♦</div>
            <span className="text-sm font-semibold">다이아몬드</span>
          </button>
          <button
            onClick={() => onSelect('CLUB')}
            className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
          >
            <div className="text-4xl">♣</div>
            <span className="text-sm font-semibold">클럽</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
