import { CardSuit } from '@mafia/shared';
import GameModal, { GameModalHeader, GameModalTitle, GameModalDescription } from './GameModal';

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
    <GameModal open={open} onClose={() => onOpenChange(false)} width={480}>
      <GameModalHeader>
        <GameModalTitle className="text-[26px]">문양 선택</GameModalTitle>
        <GameModalDescription className="text-[16px]">
          7 카드를 사용했습니다. 변경할 문양을 선택하세요.
        </GameModalDescription>
      </GameModalHeader>
      
      <div className="grid grid-cols-2 gap-5 py-4">
        <button
          onClick={() => onSelect('SPADE')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-amber-300 rounded-lg hover:border-purple-500 hover:bg-purple-100/50 transition-all bg-amber-100/50"
        >
          <div className="text-[48px]">♠</div>
          <span className="text-[16px] font-semibold text-amber-900">스페이드</span>
        </button>
        <button
          onClick={() => onSelect('HEART')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-amber-300 rounded-lg hover:border-purple-500 hover:bg-purple-100/50 transition-all bg-amber-100/50"
        >
          <div className="text-[48px] text-red-600">♥</div>
          <span className="text-[16px] font-semibold text-amber-900">하트</span>
        </button>
        <button
          onClick={() => onSelect('DIAMOND')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-amber-300 rounded-lg hover:border-purple-500 hover:bg-purple-100/50 transition-all bg-amber-100/50"
        >
          <div className="text-[48px] text-red-600">♦</div>
          <span className="text-[16px] font-semibold text-amber-900">다이아몬드</span>
        </button>
        <button
          onClick={() => onSelect('CLUB')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-amber-300 rounded-lg hover:border-purple-500 hover:bg-purple-100/50 transition-all bg-amber-100/50"
        >
          <div className="text-[48px]">♣</div>
          <span className="text-[16px] font-semibold text-amber-900">클럽</span>
        </button>
      </div>
    </GameModal>
  );
}
