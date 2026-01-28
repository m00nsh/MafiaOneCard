import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { useColyseus } from '@/app/contexts/ColyseusContext';
import { CharacterId } from '@mafia/shared';

interface LoadingScreenProps {
  onComplete: () => void;
  onBack?: () => void;
  // 빠른 게임 모드용 props
  gameMode?: 'quick' | 'custom';
  selectedCharacters?: string[];
  nickname?: string;
  roomCode?: string; // 커스텀 게임용 방 코드
  isHost?: boolean; // 커스텀 게임용 호스트 여부
  onGameStart?: () => void; // 게임 시작 시 호출
}

export default function LoadingScreen({ 
  onComplete, 
  onBack,
  gameMode,
  selectedCharacters = [],
  nickname = '',
  roomCode = '',
  isHost = false,
  onGameStart
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [matchingMessage, setMatchingMessage] = useState('매칭 중...');
  const { status, gameState, connect, disconnect, onMessage } = useColyseus();

  // 게임 모드별 서버 연결
  useEffect(() => {
    console.log('[LoadingScreen] 게임 모드별 서버 연결 useEffect 실행');
    console.log('[LoadingScreen] Props:', { gameMode, nickname, roomCode, isHost, selectedCharacters });
    
    if (gameMode === 'quick') {
      console.log('[LoadingScreen] 빠른 게임 모드: 서버 연결 시작');
      // 빠른 게임 모드: 서버 연결
      const characterId = selectedCharacters[0] as CharacterId | undefined;
      const playerName = nickname || `Player-${Math.random().toString(36).substr(2, 9)}`;
      console.log('[LoadingScreen] 빠른 게임 연결 옵션:', { name: playerName, characterId, mode: 'quick' });
      
      connect({
        name: playerName,
        characterId: characterId,
        mode: 'quick',
      }).catch((error) => {
        console.error('[LoadingScreen] 빠른 게임 연결 실패:', error);
      });

      // 게임 화면으로 이동할 때 연결 유지 (cleanup에서 disconnect 하지 않음)
      return () => {
        console.log('[LoadingScreen] 빠른 게임 모드: 컴포넌트 언마운트 (연결 유지)');
      };
    } else if (gameMode === 'custom') {
      console.log('[LoadingScreen] 커스텀 게임 모드: 서버 연결 시작');
      // 커스텀 게임 모드: 방 코드 기반 연결
      if (!roomCode) {
        console.error('[LoadingScreen] 커스텀 게임에 방 코드가 없습니다.');
        setMatchingMessage('방 코드가 필요합니다.');
        return;
      }

      console.log('[LoadingScreen] 커스텀 게임 연결 정보:', { roomCode, isHost, nickname });
      setMatchingMessage('서버에 연결 중...');
      setProgress(20);

      const characterId = selectedCharacters[0] as CharacterId | undefined;
      const playerName = nickname || `Player-${Math.random().toString(36).substr(2, 9)}`;
      const connectOptions = {
        name: playerName,
        characterId: characterId,
        mode: 'custom' as const,
        roomCode: roomCode,
        isHost: isHost,
      };
      console.log('[LoadingScreen] 커스텀 게임 연결 옵션:', connectOptions);
      
      connect(connectOptions).catch((error) => {
        console.error('[LoadingScreen] 커스텀 게임 연결 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '연결 실패';
        console.log('[LoadingScreen] 에러 메시지:', errorMessage);
        setMatchingMessage(errorMessage);
        setProgress(0);
        
        // 에러 메시지에 따라 사용자에게 알림
        if (errorMessage.includes('존재하지 않는 방') || errorMessage.includes('Invalid room code')) {
          console.log('[LoadingScreen] 방 코드 오류 감지');
          // 방 코드 오류는 이미 에러 메시지에 포함되어 있음
        }
      });

      // 게임 화면으로 이동할 때 연결 유지 (cleanup에서 disconnect 하지 않음)
      return () => {
        console.log('[LoadingScreen] 커스텀 게임 모드: 컴포넌트 언마운트 (연결 유지)');
      };
    } else {
      // 기타 모드: 기존 로직 (2초 후 완료)
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
  }, [gameMode, selectedCharacters, nickname, roomCode, isHost, connect, disconnect, onComplete]);

  // 커스텀 게임 모드: 연결 상태 모니터링
  useEffect(() => {
    if (gameMode !== 'custom') return;

    console.log('[LoadingScreen] 커스텀 게임 연결 상태 변경:', status);
    
    if (status === 'connecting') {
      console.log('[LoadingScreen] 연결 중...');
      setMatchingMessage('서버에 연결 중...');
      setProgress(30);
    } else if (status === 'connected') {
      console.log('[LoadingScreen] 연결 성공! 방에 입장했습니다.');
      setMatchingMessage('방에 입장했습니다!');
      setProgress(100);
      setTimeout(() => {
        console.log('[LoadingScreen] onComplete 호출');
        onComplete();
      }, 500);
    } else if (status === 'error') {
      console.error('[LoadingScreen] 연결 에러 상태');
      // 에러 메시지는 connect 함수의 catch에서 이미 설정됨
      // 여기서는 progress만 업데이트
      if (progress === 0) {
        // 에러가 이미 표시되고 있음
        console.log('[LoadingScreen] 에러가 이미 표시됨');
      }
    }
  }, [gameMode, status, progress, onComplete]);

  // 빠른 게임 모드: 게임 상태 모니터링
  useEffect(() => {
    if (gameMode !== 'quick') return;

    console.log('[LoadingScreen] 빠른 게임 연결 상태 변경:', status);
    
    // 연결 상태에 따른 메시지 업데이트
    if (status === 'connecting') {
      console.log('[LoadingScreen] 빠른 게임: 연결 중...');
      setMatchingMessage('서버에 연결 중...');
      setProgress(20);
    } else if (status === 'connected') {
      console.log('[LoadingScreen] 빠른 게임: 연결 성공, 플레이어 매칭 대기');
      setMatchingMessage('플레이어 매칭 중...');
      setProgress(40);
    } else if (status === 'error') {
      console.error('[LoadingScreen] 빠른 게임: 연결 에러');
      setMatchingMessage('연결 실패. 다시 시도해주세요.');
      setProgress(0);
    }
  }, [gameMode, status]);

  // 게임 상태 변경 감지 (별도 useEffect로 분리하여 더 확실하게 감지)
  useEffect(() => {
    if (gameMode !== 'quick') return;

    const gameStatus = gameState?.status;
    console.log('[LoadingScreen] 빠른 게임 상태 변경:', gameStatus);
    console.log('[LoadingScreen] 현재 플레이어 수:', gameState?.players?.size || 0);
    
    if (gameStatus === 'LOBBY') {
      console.log('[LoadingScreen] 로비 상태: 플레이어 대기 중');
      setMatchingMessage('플레이어 대기 중...');
      setProgress(60);
    } else if (gameStatus === 'PLAYING') {
      // 게임 시작!
      console.log('[LoadingScreen] 게임 상태가 PLAYING으로 변경됨');
      console.log('[LoadingScreen] 게임 시작!');
      setMatchingMessage('게임 시작!');
      setProgress(100);
      setTimeout(() => {
        console.log('[LoadingScreen] onGameStart 호출');
        if (onGameStart) {
          onGameStart();
        }
      }, 500);
    }
  }, [gameMode, gameState?.status, gameState?.players?.size, onGameStart]);

  // game_start 메시지 리스닝 (백엔드에서 게임 시작 시 브로드캐스트)
  useEffect(() => {
    if (gameMode !== 'quick' || status !== 'connected') return;

    console.log('[LoadingScreen] game_start 메시지 리스너 등록');
    const cleanup = onMessage<{ initialCard: any }>('game_start', (message) => {
      console.log('[LoadingScreen] 게임 시작 메시지 수신:', message);
      setMatchingMessage('게임 시작!');
      setProgress(100);
      setTimeout(() => {
        console.log('[LoadingScreen] onGameStart 호출 (메시지 수신)');
        if (onGameStart) {
          onGameStart();
        }
      }, 500);
    });
    return cleanup;
  }, [gameMode, status, onMessage, onGameStart]);

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