import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import PlayingCard from '@/app/components/PlayingCard';
import { Card } from '@/app/utils/gameLogic';
import GameModal, { GameModalHeader, GameModalTitle, GameModalDescription, GameModalFooter } from './GameModal';

interface CardSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Card[];
  onConfirm: (selectedCardId: string) => void;
}

/**
 * 카드 선택 다이얼로그 컴포넌트
 * 잡상인 스킬 사용 시 내 손패에서 카드를 선택합니다.
 */
export default function CardSelectDialog({
  open,
  onOpenChange,
  cards,
  onConfirm,
}: CardSelectDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleConfirm = () => {
    if (selectedCardId) {
      onConfirm(selectedCardId);
      setSelectedCardId(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedCardId(null);
    onOpenChange(false);
  };

  return (
    <GameModal open={open} onClose={handleCancel} width={800}>
      <GameModalHeader>
        <GameModalTitle className="text-[26px]">카드 선택</GameModalTitle>
        <GameModalDescription className="text-[16px]">넘길 카드를 선택해주세요.</GameModalDescription>
      </GameModalHeader>

      <div className="py-2">
        <div className="flex flex-wrap gap-4 justify-center max-h-[360px] overflow-y-auto p-5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
          {cards.map((card) => {
            const isSelected = selectedCardId === card.id;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`cursor-pointer transition-all transform ${
                  isSelected
                    ? 'scale-110 ring-4 ring-purple-600 z-10'
                    : 'hover:scale-105'
                }`}
              >
                <PlayingCard
                  card={card}
                  isPlayable={true}
                  onClick={() => {}}
                  className="shadow-lg"
                  style={{ width: '90px' }}
                />
              </div>
            );
          })}
        </div>

        {selectedCardId && (
          <div className="mt-4 p-4 bg-green-100/80 dark:bg-green-900/30 rounded-lg text-center border border-green-400">
            <p className="text-[16px] text-green-700 dark:text-green-300">
              ✓ 카드를 선택했습니다.
            </p>
          </div>
        )}
      </div>

      <GameModalFooter>
        <Button 
          variant="outline" 
          onClick={handleCancel}
          className="px-8 py-3 text-[16px] border-amber-400 text-amber-800 hover:bg-amber-200"
        >
          취소
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedCardId}
          className="px-8 py-3 text-[16px] bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
        >
          확인
        </Button>
      </GameModalFooter>
    </GameModal>
  );
}
