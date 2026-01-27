import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { PlayerInfo } from '@mafia/shared';
import { CHARACTER_SKILLS, CharacterId } from '@mafia/shared';
import GameModal, { GameModalHeader, GameModalTitle, GameModalDescription, GameModalFooter } from './GameModal';

interface PlayerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Map<string, PlayerInfo>;
  myId: string;
  characterId: CharacterId | null;
  targetCount: number; // 선택할 플레이어 수 (1 또는 2)
  onConfirm: (selectedPlayerIds: string[]) => void;
}

/**
 * 플레이어 선택 다이얼로그 컴포넌트
 * 스킬 사용 시 대상 플레이어를 선택합니다.
 */
export default function PlayerSelectDialog({
  open,
  onOpenChange,
  players,
  myId,
  characterId,
  targetCount,
  onConfirm,
}: PlayerSelectDialogProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // 내 자신을 제외한 플레이어 목록
  const availablePlayers = Array.from(players.entries())
    .filter(([id]) => id !== myId)
    .map(([id, player]) => ({ id, player }));

  const skillInfo = characterId ? CHARACTER_SKILLS[characterId] : null;
  const skillName = skillInfo?.name || '스킬';

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        // 이미 선택된 플레이어면 제거
        return prev.filter((id) => id !== playerId);
      } else {
        // 선택되지 않은 플레이어면 추가
        if (targetCount === 1) {
          // 1명만 선택 가능하면 기존 선택 제거
          return [playerId];
        } else {
          // 2명 선택 가능하면 최대 2명까지
          if (prev.length >= targetCount) {
            return [playerId]; // 이미 2명 선택되어 있으면 새로 선택
          }
          return [...prev, playerId];
        }
      }
    });
  };

  const handleConfirm = () => {
    if (selectedPlayerIds.length === targetCount) {
      onConfirm(selectedPlayerIds);
      setSelectedPlayerIds([]);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedPlayerIds([]);
    onOpenChange(false);
  };

  const isConfirmDisabled = selectedPlayerIds.length !== targetCount;

  return (
    <GameModal open={open} onClose={handleCancel} width={580}>
      <GameModalHeader>
        <GameModalTitle className="text-[26px]">
          {skillName} - 대상 플레이어 선택
        </GameModalTitle>
        <GameModalDescription className="text-[16px]">
          {targetCount === 1
            ? '대상 플레이어 1명을 선택해주세요.'
            : '대상 플레이어 2명을 선택해주세요.'}
        </GameModalDescription>
      </GameModalHeader>

      <div className="py-2">
        <div className="grid grid-cols-1 gap-4 max-h-[320px] overflow-y-auto pr-2">
          {availablePlayers.map(({ id, player }) => {
            const isSelected = selectedPlayerIds.includes(id);
            const characterName = player.characterId
              ? CHARACTER_SKILLS[player.characterId as CharacterId]?.name || '캐릭터'
              : '캐릭터';

            return (
              <button
                key={id}
                onClick={() => handlePlayerClick(id)}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-600 bg-purple-100 dark:bg-purple-900/40'
                    : 'border-amber-300 dark:border-amber-600 hover:border-purple-400 bg-amber-100/50 dark:bg-amber-900/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[18px] text-amber-900 dark:text-amber-100">
                      {player.nickname || `Player ${id.slice(0, 8)}`}
                    </p>
                    <p className="text-[15px] text-amber-700 dark:text-amber-300">
                      {characterName} · 카드 {player.handCount || 0}장
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-[28px] h-[28px] rounded-full bg-purple-600 flex items-center justify-center">
                      <span className="text-white text-[16px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedPlayerIds.length > 0 && (
          <div className="mt-4 p-4 bg-blue-100/80 dark:bg-blue-900/30 rounded-lg border border-blue-400">
            <p className="text-[16px] text-blue-700 dark:text-blue-300">
              선택된 플레이어: {selectedPlayerIds.length}/{targetCount}
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
          disabled={isConfirmDisabled}
          className="px-8 py-3 text-[16px] bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
        >
          확인 ({selectedPlayerIds.length}/{targetCount})
        </Button>
      </GameModalFooter>
    </GameModal>
  );
}
