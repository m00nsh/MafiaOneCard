import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { useColyseusRoom } from '@/app/hooks/useColyseusRoom';
import { CharacterId } from '@mafia/shared';

interface LoadingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
  // 빠른 게임 모드용 props
  gameMode?: 'quick' | 'custom';
  selectedCharacters?: string[];
  nickname?: string;
  onGameStart?: () => void; // 게임 시작 시 호출
}

export default function LoadingScreen({ 
  onComplete, 
  onBack,
  gameMode,
  selectedCharacters = [],
  nickname = '',
  onGameStart
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [matchingMessage, setMatchingMessage] = useState('매칭 중...');
  const { status, gameState, connect, disconnect, onMessage } = useColyseusRoom();

  // 빠른 게임 모드: 서버 연결 및 매칭 대기
  useEffect(() => {
    if (gameMode !== 'quick') {
      // 커스텀 게임 모드: 기존 로직 (2초 후 완료)
      const duration = 2000;
      const interval = 50;
      const increment = (interval / duration) * 100;

      const timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + increment;
          if (next >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              onComplete();
            }, 500);
            return 100;
          }
          return next;
        });
      }, interval);

      return () => clearInterval(timer);
    }

    // 빠른 게임 모드: 서버 연결
    const characterId = selectedCharacters[0] as CharacterId | undefined;
    connect({
      name: nickname || `Player-${Math.random().toString(36).substr(2, 9)}`,
      characterId: characterId,
      mode: 'quick',
    });

    return () => {
      // 컴포넌트 언마운트 시 연결 해제
      disconnect();
    };
  }, [gameMode, selectedCharacters, nickname, connect, disconnect, onComplete]);

  // 빠른 게임 모드: 게임 상태 모니터링
  useEffect(() => {
    if (gameMode !== 'quick') return;

    // 연결 상태에 따른 메시지 업데이트
    if (status === 'connecting') {
      setMatchingMessage('서버에 연결 중...');
      setProgress(20);
    } else if (status === 'connected') {
      setMatchingMessage('플레이어 매칭 중...');
      setProgress(40);
    } else if (status === 'error') {
      setMatchingMessage('연결 실패. 다시 시도해주세요.');
      setProgress(0);
    }
  }, [gameMode, status]);

  // 게임 상태 변경 감지 (별도 useEffect로 분리하여 더 확실하게 감지)
  useEffect(() => {
    if (gameMode !== 'quick') return;

    const gameStatus = gameState?.status;
    
    if (gameStatus === 'LOBBY') {
      setMatchingMessage('플레이어 대기 중...');
      setProgress(60);
    } else if (gameStatus === 'PLAYING') {
      // 게임 시작!
      console.log('[LoadingScreen] 게임 상태가 PLAYING으로 변경됨');
      setMatchingMessage('게임 시작!');
      setProgress(100);
      setTimeout(() => {
        if (onGameStart) {
          onGameStart();
        }
      }, 500);
    }
  }, [gameMode, gameState?.status, onGameStart]);

  // game_start 메시지 리스닝 (백엔드에서 게임 시작 시 브로드캐스트)
  useEffect(() => {
    if (gameMode !== 'quick' || !onMessage) return;

    onMessage<{ initialCard: any }>('game_start', (message) => {
      console.log('[LoadingScreen] 게임 시작 메시지 수신:', message);
      setMatchingMessage('게임 시작!');
      setProgress(100);
      setTimeout(() => {
        if (onGameStart) {
          onGameStart();
        }
      }, 500);
    });
  }, [gameMode, onMessage, onGameStart]);

  return (
    <LandscapeLayout>
      <div 
        className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Lobby_background.png)',
        }}
      >
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
            {gameMode === 'quick' ? matchingMessage : 'Loading...'}
          </h2>

          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_white]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {gameMode === 'quick' && gameState?.status === 'LOBBY' && (
            <div className="text-white/80 text-sm">
              현재 플레이어: {gameState.players?.size || 0}명
            </div>
          )}
        </div>
      </div>
    </LandscapeLayout>
  );
}