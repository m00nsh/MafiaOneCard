import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

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
  playerCount: number;
  onComplete: (selectedCharacters: string[]) => void;
}

export default function CharacterSelectScreen({ playerCount, onComplete }: CharacterSelectScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);

  // Adjust visible characters based on screen size
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth < 640) return 1; // mobile
    if (window.innerWidth < 1024) return 2; // tablet
    return 4; // desktop
  };

  const [visibleCount, setVisibleCount] = useState(getVisibleCount());

  // Update visible count on resize
  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleSelectCharacter = (characterId: string) => {
    const newSelected = [...selectedCharacters, characterId];
    setSelectedCharacters(newSelected);

    if (currentPlayer < playerCount) {
      setCurrentPlayer(currentPlayer + 1);
    } else {
      onComplete(newSelected);
    }
  };

  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8 overflow-hidden">
      <h2 className="text-2xl sm:text-3xl text-white mb-3 sm:mb-4">
        플레이어 {currentPlayer} - 캐릭터 선택
      </h2>
      <p className="text-white/80 mb-6 sm:mb-8">({currentPlayer}/{playerCount})</p>

      <div className="relative flex items-center gap-2 sm:gap-4 w-full max-w-6xl justify-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="p-2 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </button>

        <div className="flex gap-3 sm:gap-6 overflow-hidden justify-center">
          {visibleCharacters.map((character) => (
            <div
              key={character.id}
              onClick={() => handleSelectCharacter(character.id)}
              className="w-[150px] sm:w-[200px] bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden cursor-pointer hover:bg-white/20 transition-all transform hover:scale-105 shadow-xl flex-shrink-0"
            >
              <div className="h-[150px] sm:h-[200px] overflow-hidden">
                <ImageWithFallback
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 sm:p-4 space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-xl text-white text-center">{character.name}</h3>
                <p className="text-xs sm:text-sm text-white/80 min-h-[45px] sm:min-h-[60px] line-clamp-3">{character.description}</p>
                <p className="text-yellow-400 text-center text-sm">쿨타임: {character.cooldown}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex >= characters.length - visibleCount}
          className="p-2 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </button>
      </div>
    </div>
  );
}