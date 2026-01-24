import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

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
          setTimeout(onComplete, 300);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8">
      {/* Back button - consistent position */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      )}
      
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-2xl sm:text-3xl text-white text-center mb-6 sm:mb-8">로딩 중...</h2>
        <div className="w-full h-6 sm:h-8 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white text-center text-lg">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}