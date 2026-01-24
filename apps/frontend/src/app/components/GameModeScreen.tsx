import { generateRandomNickname } from '@/app/utils/nicknameGenerator';
import { GameMode } from '@/app/App';
import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

interface GameModeScreenProps {
  onSelectMode: (mode: GameMode, isHost: boolean) => void;
  onSetNickname: (nickname: string) => void;
  onBack: () => void;
}

export default function GameModeScreen({ onSelectMode, onSetNickname, onBack }: GameModeScreenProps) {
  const [nickname, setNickname] = useState(() => generateRandomNickname());

  const handleModeSelect = (mode: GameMode, isHost: boolean) => {
    if (!nickname.trim()) {
      toast.error('닉네임을 입력해주세요!');
      return;
    }
    onSetNickname(nickname);
    onSelectMode(mode, isHost);
  };

  return (
    <LandscapeLayout>
      <div className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* Top Bar: Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="text-center space-y-4 w-full max-w-4xl mt-4">
          <h2 className="text-4xl sm:text-6xl text-white font-medium tracking-wide mb-2">Select Game Mode</h2>

          {/* Nickname Input */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="bg-gray-200 px-6 py-3 rounded-lg shadow-md flex items-center gap-2">
              <span className="text-gray-700 font-medium whitespace-nowrap">Your nickname is:</span>
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임 입력"
                  className="bg-transparent border-b-2 border-gray-400 focus:border-black outline-none w-24 sm:w-32 text-black font-bold text-center"
                  maxLength={10}
                />
              </div>
              <Pencil className="w-4 h-4 text-black cursor-pointer" />
            </div>
          </div>

          {/* Game mode buttons layout */}
          <div className="flex flex-row gap-6 items-stretch justify-center h-[200px] sm:h-[240px] w-full px-4 sm:px-0">
            {/* Custom game buttons container (Left) */}
            <div className="flex flex-col gap-4 flex-1">
              <button
                onClick={() => handleModeSelect('custom', true)}
                className="flex-1 px-4 sm:px-8 py-4 bg-gray-300 hover:bg-gray-200 text-gray-900 text-xl sm:text-2xl font-bold rounded-3xl transition-all transform hover:scale-[1.02] shadow-xl border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 whitespace-nowrap"
              >
                방 만들기
              </button>
              <button
                onClick={() => handleModeSelect('custom', false)}
                className="flex-1 px-4 sm:px-8 py-4 bg-gray-300 hover:bg-gray-200 text-gray-900 text-xl sm:text-2xl font-bold rounded-3xl transition-all transform hover:scale-[1.02] shadow-xl border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 whitespace-nowrap"
              >
                방 참여하기
              </button>
            </div>

            {/* Quick game button (Right) */}
            <div className="flex-1 flex">
              <button
                onClick={() => handleModeSelect('quick', false)}
                className="w-full h-full bg-gray-300 hover:bg-gray-200 text-gray-900 text-2xl sm:text-3xl font-bold rounded-[3rem] transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center border-b-8 border-gray-400 active:border-b-0 active:translate-y-2 whitespace-nowrap"
              >
                빠른 게임
              </button>
            </div>
          </div>
        </div>
      </div>
    </LandscapeLayout>
  );
}
