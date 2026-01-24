import { ArrowLeft } from 'lucide-react';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { useState } from 'react';

interface PlayerCountScreenProps {
  onSelectCount: (count: number) => void;
  onBack: () => void;
}

export default function PlayerCountScreen({ onSelectCount, onBack }: PlayerCountScreenProps) {
  const playerCounts = [2, 3, 4, 5];
  const [selected, setSelected] = useState<number | null>(null);

  const handleStart = () => {
    if (selected) {
      onSelectCount(selected);
    }
  };

  return (
    <LandscapeLayout>
      <div className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* Header - Top Left "빠른 게임" */}
        <div className="absolute top-4 left-16 flex items-center gap-2">
          <span className="text-white text-lg font-bold">빠른 게임</span>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="text-center space-y-8 w-full max-w-4xl mt-8">
          <h2 className="text-3xl sm:text-5xl text-white font-medium mb-12">몇 명이서 게임 할까요?</h2>

          <div className="flex flex-row gap-4 justify-center">
            {playerCounts.map((count) => (
              <button
                key={count}
                onClick={() => setSelected(count)}
                className={`w-40 h-40 sm:w-40 sm:h-40 text-2xl sm:text-4xl font-bold rounded-xl transition-all shadow-lg flex items-center justify-center ${selected === count
                  ? 'bg-gray-200 text-gray-900 border-4 border-white transform scale-105'
                  : 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                  }`}
              >
                {count}명
              </button>
            ))}
          </div>

          <div className="mt-12">
            <button
              onClick={handleStart}
              disabled={!selected}
              className={`px-12 py-3 text-xl sm:text-2xl font-bold rounded-full transition-all shadow-lg ${selected
                ? 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                }`}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </LandscapeLayout>
  );
}