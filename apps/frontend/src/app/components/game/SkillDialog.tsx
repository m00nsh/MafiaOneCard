import { useState, useEffect } from 'react';
import { CharacterId, CHARACTER_SKILLS, UseSkillMessage, PlayerInfo } from '@mafia/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { getSkillRequiredInputs } from '@/app/utils/skillUtils';
import PlayerSelectDialog from '@/app/components/game/PlayerSelectDialog';
import CardSelectDialog from '@/app/components/game/CardSelectDialog';
import { Card } from '@/app/utils/gameLogic';

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: CharacterId | null;
  skillProgress: number;
  skillMaxCooldown: number;
  skillUsesLeft: number;
  players: Map<string, PlayerInfo>;
  myId: string;
  myHand: Card[];
  playerCount: number;
  attackStack: number; // 탱커 스킬 확인용
  onConfirm: (message: UseSkillMessage) => void;
}

/**
 * 스킬 사용 다이얼로그 컴포넌트
 * 스킬 사용 확인 및 필요한 입력을 처리합니다.
 */
export default function SkillDialog({
  open,
  onOpenChange,
  characterId,
  skillProgress,
  skillMaxCooldown,
  skillUsesLeft,
  players,
  myId,
  myHand,
  playerCount,
  attackStack,
  onConfirm,
}: SkillDialogProps) {
  const skillInfo = characterId ? CHARACTER_SKILLS[characterId] : null;
  const requiredInputs = getSkillRequiredInputs(characterId, playerCount);

  // 탱커 스킬: 공격 스택이 없으면 사용 불가
  const isTankSkillBlocked = characterId === 'tank' && attackStack === 0;

  // 다이얼로그 상태 관리
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [showCardSelect, setShowCardSelect] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // 다이얼로그가 열릴 때 상태 초기화
  useEffect(() => {
    if (open) {
      setSelectedPlayerIds([]);
      setSelectedCardId(null);
      setShowPlayerSelect(false);
      setShowCardSelect(false);
    }
  }, [open]);

  if (!skillInfo || !characterId) {
    return null;
  }

  // 잡상인: 먼저 카드 선택, 그 다음 플레이어 선택
  const handleMerchantFlow = () => {
    if (!selectedCardId) {
      setShowCardSelect(true);
      return;
    }
    if (selectedPlayerIds.length === 0) {
      setShowPlayerSelect(true);
      return;
    }
    // 카드와 플레이어 모두 선택 완료
    onConfirm({
      skillId: characterId,
      selectedCardId,
      targetPlayerId: selectedPlayerIds[0],
    });
    onOpenChange(false);
  };

  // 일반 스킬 사용 확인
  const handleConfirm = () => {
    // 필요한 입력이 있으면 해당 다이얼로그 열기
    if (requiredInputs.needsCard && !selectedCardId) {
      setShowCardSelect(true);
      return;
    }
    if (requiredInputs.needsTarget && selectedPlayerIds.length < requiredInputs.targetCount) {
      setShowPlayerSelect(true);
      return;
    }

    // 모든 입력 완료 시 스킬 사용 (도둑/예언자/탱커는 추가 입력 없이 즉시 사용)
    const message: UseSkillMessage = {
      skillId: characterId,
      targetPlayerId: requiredInputs.needsTarget && selectedPlayerIds.length > 0
        ? selectedPlayerIds.length === 1
          ? selectedPlayerIds[0]
          : undefined // 광전사는 여러 명 선택하지만 백엔드에서 처리
        : undefined,
      selectedCardId: requiredInputs.needsCard ? selectedCardId || undefined : undefined,
    };

    onConfirm(message);
    onOpenChange(false);
  };

  // 버튼 활성화 여부 계산
  // 탱커 스킬: 공격 스택이 없으면 비활성화
  // 그 외에는 필요한 입력이 완료되지 않았어도 버튼을 활성화 (다이얼로그 열기 위해)
  const isButtonDisabled = isTankSkillBlocked;

  const handlePlayerSelectConfirm = (playerIds: string[]) => {
    setSelectedPlayerIds(playerIds);
    setShowPlayerSelect(false);
    
    // 잡상인: 카드 선택 후 플레이어 선택 완료
    if (characterId === 'merchant' && selectedCardId) {
      onConfirm({
        skillId: characterId,
        selectedCardId,
        targetPlayerId: playerIds[0],
      });
      onOpenChange(false);
    }
  };

  const handleCardSelectConfirm = (cardId: string) => {
    setSelectedCardId(cardId);
    setShowCardSelect(false);
    
    // 잡상인: 카드 선택 후 플레이어 선택 다이얼로그 열기
    if (characterId === 'merchant') {
      setShowPlayerSelect(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{skillInfo.name} 스킬 사용</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {skillInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* 스킬 정보 */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">쿨타임:</span>
                <span className="font-bold">
                  {skillInfo.cooldown > 0
                    ? `${skillInfo.cooldown}턴`
                    : skillInfo.maxUses
                    ? `게임 중 ${skillInfo.maxUses}회 사용 가능`
                    : '제한 없음'}
                </span>
              </div>
              {skillInfo.cooldown > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">현재 진행도:</span>
                  <span className="font-bold">
                    {skillProgress}/{skillMaxCooldown}
                  </span>
                </div>
              )}
              {skillInfo.cooldown === 0 && skillInfo.maxUses && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">남은 사용 횟수:</span>
                  <span className="font-bold">{skillUsesLeft}회</span>
                </div>
              )}
            </div>
          </div>

          {/* 탱커 스킬 경고 */}
          {isTankSkillBlocked && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-bold">
                ⚠ 탱커 스킬은 공격 스택이 있을 때만 사용할 수 있습니다.
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                현재 공격 스택: {attackStack}
              </p>
            </div>
          )}

          {/* 선택된 입력 표시 */}
          {requiredInputs.needsCard && selectedCardId && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ 카드를 선택했습니다.
              </p>
            </div>
          )}
          {requiredInputs.needsTarget && selectedPlayerIds.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ {selectedPlayerIds.length}명의 플레이어를 선택했습니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            onClick={characterId === 'merchant' ? handleMerchantFlow : handleConfirm}
            className="bg-purple-600 hover:bg-purple-500"
            disabled={isButtonDisabled}
          >
            {isTankSkillBlocked
              ? '공격 스택 필요'
              : requiredInputs.needsCard && !selectedCardId
              ? '카드 선택'
              : requiredInputs.needsTarget && selectedPlayerIds.length < requiredInputs.targetCount
              ? `플레이어 선택 (${selectedPlayerIds.length}/${requiredInputs.targetCount})`
              : '스킬 사용'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 플레이어 선택 다이얼로그 */}
      <PlayerSelectDialog
        open={showPlayerSelect}
        onOpenChange={setShowPlayerSelect}
        players={players}
        myId={myId}
        characterId={characterId}
        targetCount={requiredInputs.targetCount}
        onConfirm={handlePlayerSelectConfirm}
      />

      {/* 카드 선택 다이얼로그 */}
      <CardSelectDialog
        open={showCardSelect}
        onOpenChange={setShowCardSelect}
        cards={myHand}
        onConfirm={handleCardSelectConfirm}
      />
    </Dialog>
  );
}
