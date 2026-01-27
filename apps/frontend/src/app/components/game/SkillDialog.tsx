import { useState, useEffect } from 'react';
import { CharacterId, CHARACTER_SKILLS, UseSkillMessage, PlayerInfo } from '@mafia/shared';
import { Button } from '@/app/components/ui/button';
import { getSkillRequiredInputs } from '@/app/utils/skillUtils';
import PlayerSelectDialog from '@/app/components/game/PlayerSelectDialog';
import CardSelectDialog from '@/app/components/game/CardSelectDialog';
import { Card } from '@/app/utils/gameLogic';
import GameModal, { GameModalHeader, GameModalTitle, GameModalDescription, GameModalFooter } from './GameModal';

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
  onCheckSummon?: (targetId: string) => Promise<any>;
}

/**
 * 스킬 사용 다이얼로그 컴포넌트
 * 스킬 사용 확인 및 필요한 입력을 처리합니다.
 */
export default function SkillDialog(props: SkillDialogProps) {
  const {
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
  } = props;
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
      setSelectedCardId(null);
      setShowPlayerSelect(false);
      setShowCardSelect(false);
      setSummonSourceId(null);
      setSummonRequiredInput('NONE');
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
      // 단일 타겟: 1명만 선택된 경우
      targetPlayerId: requiredInputs.needsTarget && selectedPlayerIds.length === 1
        ? selectedPlayerIds[0]
        : undefined,
      // 다중 타겟: 2명 이상 선택된 경우 (광전사 등)
      targetPlayerIds: requiredInputs.needsTarget && selectedPlayerIds.length >= 1
        ? selectedPlayerIds
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

  // 소환사 관련 상태
  const [summonSourceId, setSummonSourceId] = useState<string | null>(null);
  const [summonRequiredInput, setSummonRequiredInput] = useState<'CARD' | 'TARGET' | 'NONE'>('NONE');

  const handlePlayerSelectConfirm = async (playerIds: string[]) => {
    // 1. 소환사 1차 타겟 선택 (능력 복제 대상)
    if (characterId === 'summoner' && !summonSourceId) {
      const sourceId = playerIds[0];
      setSummonSourceId(sourceId);
      setShowPlayerSelect(false); // 일단 닫음

      // 서버에 필요 재료 확인
      if (props.onCheckSummon) {
        // Loading indicator could be good here
        const result = await props.onCheckSummon(sourceId);
        if (!result || !result.success) {
          // 에러 처리 또는 취소
          console.error("Summon check failed", result);
          return;
        }

        const required = result.requiredInput || 'NONE';
        setSummonRequiredInput(required);

        if (required === 'CARD') {
          setShowCardSelect(true);
        } else if (required === 'TARGET') {
          // 2차 타겟 선택 창 열기
          // 메시지 등을 "스킬 대상을 선택하세요"로 바꾸면 좋음 (현재 컴포넌트는 재사용)
          setSelectedPlayerIds([]); // 초기화
          setShowPlayerSelect(true);
        } else {
          // 추가 입력 없음 -> 즉시 실행
          onConfirm({
            skillId: characterId,
            targetPlayerId: sourceId // 소환대상
          });
          onOpenChange(false);
        }
      }
      return;
    }

    // 2. 소환사 2차 타겟 선택 (스킬 사용 대상)
    if (characterId === 'summoner' && summonSourceId && summonRequiredInput === 'TARGET') {
      onConfirm({
        skillId: characterId,
        targetPlayerId: summonSourceId, // 1차: 누구 능력이냐
        targetPlayerIds: playerIds      // 2차: 누구에게 쓰냐
      });
      onOpenChange(false);
      return;
    }

    // 일반 스킬 로직
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
      return;
    }

    // 그 외 타겟 필요 스킬: 플레이어 선택 후 자동 스킬 사용
    // (주술사, 암살자, 광전사)
    if (characterId && playerIds.length >= requiredInputs.targetCount) {
      onConfirm({
        skillId: characterId,
        targetPlayerId: playerIds.length === 1 ? playerIds[0] : undefined,
        targetPlayerIds: playerIds,
      });
      onOpenChange(false);
    }
  };

  const handleCardSelectConfirm = (cardId: string) => {
    setSelectedCardId(cardId);
    setShowCardSelect(false);

    // 소환사: 카드 선택 완료 (Merchant 복사 시)
    if (characterId === 'summoner' && summonSourceId && summonRequiredInput === 'CARD') {
      onConfirm({
        skillId: characterId,
        targetPlayerId: summonSourceId,
        selectedCardId: cardId
      });
      onOpenChange(false);
      return;
    }

    // 잡상인: 카드 선택 후 플레이어 선택 다이얼로그 열기
    if (characterId === 'merchant') {
      setShowPlayerSelect(true);
    }
  };

  return (
    <>
      <GameModal open={open} onClose={() => onOpenChange(false)} width={560}>
        <GameModalHeader>
          <GameModalTitle className="text-[28px]">{skillInfo.name} 스킬 사용</GameModalTitle>
          <GameModalDescription className="text-[18px]">
            {skillInfo.description}
          </GameModalDescription>
        </GameModalHeader>

        <div className="space-y-3">
          {/* 스킬 정보 */}
          <div className="bg-amber-100/80 dark:bg-amber-900/50 rounded-lg p-5 border border-amber-300 dark:border-amber-700">
            <div className="space-y-3">
              <div className="flex justify-between text-[16px]">
                <span className="text-amber-700 dark:text-amber-300">쿨타임:</span>
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  {skillInfo.cooldown > 0
                    ? `${skillInfo.cooldown}턴`
                    : skillInfo.maxUses
                      ? `게임 중 ${skillInfo.maxUses}회 사용 가능`
                      : '제한 없음'}
                </span>
              </div>
              {skillInfo.cooldown > 0 && (
                <div className="flex justify-between text-[16px]">
                  <span className="text-amber-700 dark:text-amber-300">현재 진행도:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-100">
                    {skillProgress}/{skillMaxCooldown}
                  </span>
                </div>
              )}
              {skillInfo.cooldown === 0 && skillInfo.maxUses && (
                <div className="flex justify-between text-[16px]">
                  <span className="text-amber-700 dark:text-amber-300">남은 사용 횟수:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-100">{skillUsesLeft}회</span>
                </div>
              )}
            </div>
          </div>

          {/* 탱커 스킬 경고 */}
          {isTankSkillBlocked && (
            <div className="p-4 bg-red-100/80 dark:bg-red-900/30 rounded-lg border border-red-400 dark:border-red-700">
              <p className="text-[16px] text-red-700 dark:text-red-300 font-bold">
                ⚠ 탱커 스킬은 공격 스택이 있을 때만 사용할 수 있습니다.
              </p>
              <p className="text-[14px] text-red-600 dark:text-red-400 mt-1">
                현재 공격 스택: {attackStack}
              </p>
            </div>
          )}

          {/* 선택된 입력 표시 */}
          {requiredInputs.needsCard && selectedCardId && (
            <div className="p-4 bg-green-100/80 dark:bg-green-900/30 rounded-lg border border-green-400">
              <p className="text-[16px] text-green-700 dark:text-green-300">
                ✓ 카드를 선택했습니다.
              </p>
            </div>
          )}
          {requiredInputs.needsTarget && selectedPlayerIds.length > 0 && (
            <div className="p-4 bg-green-100/80 dark:bg-green-900/30 rounded-lg border border-green-400">
              <p className="text-[16px] text-green-700 dark:text-green-300">
                ✓ {selectedPlayerIds.length}명의 플레이어를 선택했습니다.
              </p>
            </div>
          )}
        </div>

        <GameModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-8 py-3 text-[16px] border-amber-400 text-amber-800 hover:bg-amber-200"
          >
            취소
          </Button>
          <Button
            onClick={characterId === 'merchant' ? handleMerchantFlow : handleConfirm}
            className="px-8 py-3 text-[16px] bg-purple-600 hover:bg-purple-500 text-white"
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
        </GameModalFooter>
      </GameModal>

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
    </>
  );
}
