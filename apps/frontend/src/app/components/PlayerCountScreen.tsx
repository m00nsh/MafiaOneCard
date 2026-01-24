import { ArrowLeft } from 'lucide-react';

interface PlayerCountScreenProps {
  onSelectCount: (count: number) => void;
  onBack: () => void;
}

export default function PlayerCountScreen({ onSelectCount, onBack }: PlayerCountScreenProps) {
  const playerCounts = [2, 3, 4, 5];

  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8">
      {/* Back button - consistent position */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>
      
      <div className="text-center space-y-6 sm:space-y-8 w-full max-w-4xl">
        <h2 className="text-3xl sm:text-4xl text-white mb-8 sm:mb-12">참가 인원 선택</h2>
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
          {playerCounts.map((count) => (
            <button
              key={count}
              onClick={() => onSelectCount(count)}
              className="px-8 sm:px-10 py-6 sm:py-8 bg-orange-500 hover:bg-orange-400 text-white text-lg sm:text-xl rounded-xl transition-all transform hover:scale-105 shadow-lg min-w-[100px] sm:min-w-[120px]"
            >
              {count}인
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}