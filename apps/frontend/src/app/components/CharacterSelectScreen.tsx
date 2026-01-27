import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

export interface Character {
  id: string;
  name: string;
  description: string;
  cooldown: string;
  imageUrl: string;
}

export const characters: Character[] = [
  {
    id: 'merchant',
    name: '잡상인',
    description: '내 패 중 한 장을 선택해 특정 플레이어에게 강제로 넘김',
    cooldown: '3턴',
    imageUrl: '/merchant.png',
  },
  {
    id: 'tank',
    name: '탱커',
    description: '나에게 들어온 공격 카드의 누적치를 50% 감쇄 (소수점 올림)',
    cooldown: '4턴',
    imageUrl: '/tank.png',
  },
  {
    id: 'thief',
    name: '도둑',
    description: '이전 턴과 다음 턴 플레이어의 패에서 각각 1장씩 무작위로 가져와 섞음',
    cooldown: '3턴',
    imageUrl: '/thief.png',
  },
  {
    id: 'prophet',
    name: '예언자',
    description: '이전 플레이어가 덱에서 가져간 카드 또는 보유한 패를 확인',
    cooldown: '3턴',
    imageUrl: '/prophet.png',
  },
  {
    id: 'shaman',
    name: '주술사',
    description: '특정 플레이어를 지목해 현재 턴에 스킬을 강제로 사용시키기 (거부 시 카드 3장)',
    cooldown: '3턴',
    imageUrl: '/shaman.png',
  },
  {
    id: 'summoner',
    name: '소환사',
    description: '다른 플레이어의 스킬을 뺏어서 사용',
    cooldown: '1회 사용',
    imageUrl: '/summoner.png',
  },
  {
    id: 'assassin',
    name: '암살자',
    description: '특정 플레이어 1명을 지목해 카드 3장 부여',
    cooldown: '5턴',
    imageUrl: '/assassin.png',
  },
  {
    id: 'berserker',
    name: '광전사',
    description: '자신이 카드 3장을 먹고 5장 먹이는 공격 시전하기',
    cooldown: '2회 사용',
    imageUrl: '/berserker.png',
  },
];

interface CharacterSelectScreenProps {
  onComplete: (selectedCharacters: string[]) => void;
}

export default function CharacterSelectScreen({ onComplete }: CharacterSelectScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Show 4 cards at a time
  const visibleCount = 4;
  const visibleCharacters = characters.slice(currentIndex, currentIndex + visibleCount);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < characters.length - visibleCount) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelect = () => {
    if (!selectedCharacterId) return;
    onComplete([selectedCharacterId]);
  };

  return (
    <LandscapeLayout>
      <div className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* Header - Top Left "캐릭터 선택하기" */}
        <div className="absolute top-4 left-16 flex items-center gap-2">
          <span className="text-white text-lg font-bold">캐릭터 선택하기</span>
        </div>

        {/* Header - Center */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl text-white font-bold mb-2">
            직업 선택
          </h2>
          <p className="text-white/80">게임에서 사용할 자신의 캐릭터를 선택해주세요</p>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-4 w-full max-w-6xl justify-center mb-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <div className="flex gap-4 sm:gap-6 overflow-hidden justify-center items-stretch h-[320px]">
            {visibleCharacters.map((character) => (
              <div
                key={character.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCharacterId(character.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedCharacterId(character.id)}
                className={`w-[200px] bg-white rounded-xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 shadow-xl flex flex-col relative ${selectedCharacterId === character.id ? 'ring-4 ring-yellow-400 scale-105' : ''
                  }`}
              >
                <div className="h-[140px] overflow-hidden">
                  <ImageWithFallback
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col items-center text-center bg-white">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{character.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-2 flex-grow">{character.description}</p>
                  <div className="mt-auto pt-2 w-full border-t border-gray-200">
                    <p className="text-orange-600 font-bold text-sm">쿨타임: {character.cooldown}</p>
                  </div>
                </div>
                {/* Selection Overlay */}
                {selectedCharacterId === character.id && (
                  <div className="absolute inset-0 bg-yellow-400/20 pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= characters.length - visibleCount}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Select Button */}
        <button
          onClick={handleSelect}
          disabled={!selectedCharacterId}
          className={`px-12 py-3 text-xl font-bold rounded-lg transition-all shadow-lg ${selectedCharacterId
            ? 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
            : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            }`}
        >
          Select
        </button>
      </div>
    </LandscapeLayout>
  );
}