import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import PlayingCard from '@/app/components/PlayingCard';
import { Card } from '@/app/utils/gameLogic';

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
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">카드 선택</DialogTitle>
          <DialogDescription className="text-base mt-2">
            넘길 카드를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex flex-wrap gap-3 justify-center max-h-[400px] overflow-y-auto p-4">
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
                    style={{ width: '6rem' }}
                  />
                </div>
              );
            })}
          </div>

          {selectedCardId && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                카드를 선택했습니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCardId}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
