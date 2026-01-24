import { GameMode } from '@/app/App';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface GameModeScreenProps {
  onSelectMode: (mode: GameMode, isHost: boolean) => void;
  onSetNickname: (nickname: string) => void;
  onBack: () => void;
}

export default function GameModeScreen({ onSelectMode, onSetNickname, onBack }: GameModeScreenProps) {
  const [nickname, setNickname] = useState('');

  const handleModeSelect = (mode: GameMode, isHost: boolean) => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    onSetNickname(nickname);
    onSelectMode(mode, isHost);
  };

  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      <div className="text-center space-y-8 w-full max-w-4xl">
        <h2 className="text-3xl sm:text-4xl text-white mb-8 sm:mb-12">게임 모드 선택</h2>
        
        {/* Nickname input */}
        <div className="mb-6 sm:mb-8">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="px-4 sm:px-6 py-2 sm:py-3 text-lg sm:text-xl text-center rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white/60 w-full max-w-md"
            maxLength={10}
          />
        </div>

        {/* Game mode buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center justify-center">
          {/* Custom game buttons container */}
          <div className="flex flex-col gap-4 w-full sm:w-auto">
            <button
              onClick={() => handleModeSelect('custom', true)}
              className="px-8 sm:px-12 py-4 sm:py-6 bg-blue-500 hover:bg-blue-400 text-white text-lg sm:text-xl rounded-xl transition-all transform hover:scale-105 shadow-lg min-w-[200px] sm:min-w-[250px]"
            >
              방 만들기
            </button>
            <button
              onClick={() => handleModeSelect('custom', false)}
              className="px-8 sm:px-12 py-4 sm:py-6 bg-blue-500 hover:bg-blue-400 text-white text-lg sm:text-xl rounded-xl transition-all transform hover:scale-105 shadow-lg min-w-[200px] sm:min-w-[250px]"
            >
              방 참여하기
            </button>
          </div>

          {/* Quick game button - matches combined height of custom buttons */}
          <button
            onClick={() => handleModeSelect('quick', false)}
            className="px-8 sm:px-12 py-12 sm:py-16 bg-purple-500 hover:bg-purple-400 text-white text-lg sm:text-xl rounded-xl transition-all transform hover:scale-105 shadow-lg min-w-[200px] sm:min-w-[250px] flex items-center justify-center"
          >
            빠른 게임
          </button>
        </div>
      </div>
    </div>
  );
}
