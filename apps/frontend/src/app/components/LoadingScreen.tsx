import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

interface LoadingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function LoadingScreen({ onComplete, onBack }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 500); // Short delay before transition
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <LandscapeLayout>
      <div className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* Header - Top Left "빠른 게임" */}
        <div className="absolute top-4 left-16 flex items-center gap-2">
          <span className="text-white text-lg font-bold">빠른 게임</span>
        </div>

        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        )}

        <div className="w-full max-w-md space-y-12 text-center">
          <h2 className="text-4xl text-white font-medium tracking-widest animate-pulse">
            Loading...
          </h2>

          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_white]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </LandscapeLayout>
  );
}