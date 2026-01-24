import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

interface MainScreenProps {
  onStart: () => void;
  onSpriteTest?: () => void;
}

export default function MainScreen({ onStart, onSpriteTest }: MainScreenProps) {
  return (
    <LandscapeLayout>


      <div className="size-full flex flex-col items-center justify-center space-y-12">
        <h1 className="text-6xl sm:text-8xl text-white font-medium tracking-wide text-center drop-shadow-lg">
          마피아 원카드
        </h1>

        <button
          onClick={onStart}
          className="px-12 py-4 bg-gray-300 hover:bg-gray-200 text-gray-900 text-2xl sm:text-3xl rounded-full transition-all transform hover:scale-105 shadow-xl font-bold min-w-[200px]"
        >
          Game Start!
        </button>

        {/* Debug Button */}
        {onSpriteTest && (
          <button
            onClick={onSpriteTest}
            className="text-white/30 text-sm hover:text-white/80 transition-colors absolute bottom-4 right-4"
          >
            [Dev: Card Sprites]
          </button>
        )}
      </div>
    </LandscapeLayout>
  );
}
