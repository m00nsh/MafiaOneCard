import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
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
    imageUrl: 'https://images.unsplash.com/photo-1606301267109-4c3fa7d41615?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZXJjaGFudCUyMHRyYWRlcnxlbnwxfHx8fDE3NjkxNjQ3NDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'tank',
    name: '탱커',
    description: '나에게 들어온 공격 카드의 누적치를 50% 감쇄 (소수점 올림)',
    cooldown: '4턴',
    imageUrl: 'https://images.unsplash.com/photo-1719421976933-6dee24e4b482?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YW5rJTIwd2FycmlvciUyMGFybW9yfGVufDF8fHx8MTc2OTE2NDc0NXww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'thief',
    name: '도둑',
    description: '이전 턴과 다음 턴 플레이어의 패에서 각각 1장씩 무작위로 가져와 섞음',
    cooldown: '3턴',
    imageUrl: 'https://images.unsplash.com/photo-1705105238704-a62b18e1b985?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGllZiUyMHJvZ3VlJTIwbmluamF8ZW58MXx8fHwxNzY5MTY0NzQ1fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'prophet',
    name: '예언자',
    description: '이전 플레이어가 덱에서 가져간 카드 또는 보유한 패를 확인',
    cooldown: '3턴',
    imageUrl: 'https://images.unsplash.com/photo-1709390658366-53f042e66fee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9waGV0JTIwb3JhY2xlJTIwbXlzdGljfGVufDF8fHx8MTc2OTE2NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'shaman',
    name: '주술사',
    description: '특정 플레이어를 지목해 현재 턴에 스킬을 강제로 사용시키기 (거부 시 카드 3장)',
    cooldown: '3턴',
    imageUrl: 'https://images.unsplash.com/photo-1603669388518-beee44ac92de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGFtYW4lMjB3aXRjaCUyMG1hZ2ljfGVufDF8fHx8MTc2OTE2NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'summoner',
    name: '소환사',
    description: '다른 플레이어의 스킬을 뺏어서 사용',
    cooldown: '1회 사용',
    imageUrl: 'https://images.unsplash.com/photo-1654663477425-acf704a970d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdW1tb25lciUyMG1hZ2UlMjB3aXphcmR8ZW58MXx8fHwxNzY5MTY0NzQ2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'assassin',
    name: '암살자',
    description: '특정 플레이어 1명을 지목해 카드 3장 부여',
    cooldown: '5턴',
    imageUrl: 'https://images.unsplash.com/photo-1651335944644-33c89ed94cc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc3Nhc3NpbiUyMHNoYWRvd3xlbnwxfHx8fDE3NjkxNjQ3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'berserker',
    name: '광전사',
    description: '자신이 카드 3장을 먹고 5장 먹이는 공격 시전하기',
    cooldown: '2회 사용',
    imageUrl: 'https://images.unsplash.com/photo-1613477757024-fb6d3fd3c0a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJyaW9yJTIwYmF0dGxlfGVufDF8fHx8MTc2OTE2NDc1NHww&ixlib=rb-4.1.0&q=80&w=1080',
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