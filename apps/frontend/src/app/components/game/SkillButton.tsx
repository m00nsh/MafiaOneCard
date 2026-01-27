import { CharacterId, CHARACTER_SKILLS } from '@mafia/shared';

interface SkillButtonProps {
  characterId: CharacterId | null;
  skillProgress: number;
  skillMaxCooldown: number;
  skillUsesLeft: number;
  isMyTurn: boolean;
  isPlaying: boolean;
  onSkillClick: () => void;
}

/**
 * 스킬 버튼 컴포넌트
 * 쿨타임 게이지와 사용 가능 여부를 표시합니다.
 */
export default function SkillButton({
  characterId,
  skillProgress,
  skillMaxCooldown,
  skillUsesLeft,
  isMyTurn,
  isPlaying,
  onSkillClick,
}: SkillButtonProps) {
  // 스킬 정보 가져오기
  const skillInfo = characterId ? CHARACTER_SKILLS[characterId] : null;
  const skillName = skillInfo?.name || '능력';

  // 스킬 사용 가능 여부 판단
  const isAvailable = (() => {
    if (!isPlaying || !isMyTurn) return false;
    if (!characterId || !skillInfo) return false;

    // 쿨타임 기반 스킬 (cooldown > 0)
    if (skillInfo.cooldown > 0) {
      return skillProgress >= skillMaxCooldown;
    }

    // 사용 횟수 기반 스킬 (cooldown === 0)
    return skillUsesLeft > 0;
  })();

  // 탱커 스킬은 공격 스택이 있을 때만 사용 가능 (이 정보는 SkillDialog에서 처리)

  return (
    <div className="flex flex-col gap-2 items-end min-w-[120px] shrink-0">
      <button
        onClick={isAvailable ? onSkillClick : undefined}
        disabled={!isAvailable}
        className={`px-6 py-8 rounded-xl text-xl font-bold shadow-lg transition-all w-full whitespace-nowrap
          ${isAvailable
            ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 cursor-pointer active:scale-95'
            : 'bg-gray-600/50 text-gray-400 cursor-not-allowed grayscale'
          }
        `}
        title={isAvailable ? `${skillName} 사용하기` : '스킬 사용 불가'}
      >
        {skillName} 사용
      </button>

      {/* 쿨타임 게이지 바 */}
      {skillMaxCooldown > 0 ? (
        <div className="bg-black/40 rounded-lg h-6 w-full overflow-hidden border border-white/30 flex">
          {Array.from({ length: skillMaxCooldown }).map((_, i) => {
            const isFilled = i < skillProgress;
            return (
              <div
                key={i}
                className={`flex-1 transition-colors duration-300 ${
                  isFilled ? 'bg-blue-500' : 'bg-transparent'
                } ${
                  i < skillMaxCooldown - 1 ? 'border-r border-white/30 border-dotted' : ''
                }`}
              />
            );
          })}
        </div>
      ) : (
        // 사용 횟수 표시 (소환사, 광전사)
        <div className="bg-black/40 rounded-lg h-6 w-full border border-white/30 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            남은 사용: {skillUsesLeft}회
          </span>
        </div>
      )}

      {/* 쿨타임 정보 텍스트 */}
      {skillMaxCooldown > 0 && (
        <p className="text-white/70 text-xs text-center w-full">
          {skillProgress}/{skillMaxCooldown}
        </p>
      )}
    </div>
  );
}
