import { useState, useEffect, useRef } from 'react';
import { Share2, X, Plus, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { useColyseus } from '@/app/contexts/ColyseusContext';

interface Player {
  id: string;
  nickname: string;
  isReady: boolean;
  isHost: boolean;
  character?: string;
}

interface RoomScreenProps {
  isHost: boolean;
  nickname: string;
  roomCode: string;
  maxPlayers: number;
  onBack: () => void;
  onSetRoomCode: (code: string) => void;
  onSetPlayerCount: (count: number) => void;
  onNavigateToCharacterSelect: () => void;
}

// Mock function to generate room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export default function RoomScreen({
  isHost,
  nickname,
  roomCode: initialRoomCode,
  maxPlayers: initialMaxPlayers,
  onBack,
  onSetRoomCode,
  onSetPlayerCount,
  onNavigateToCharacterSelect
}: RoomScreenProps) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [maxPlayers, setMaxPlayersLocal] = useState(initialMaxPlayers);
  const [players, setPlayers] = useState<Player[]>([]);
  const { status, gameState, connect, disconnect, sendMessage, onMessage, sessionId } = useColyseus();
  const hasConnectedRef = useRef(false);
  const connectingRef = useRef(false);
  const roomCodeRef = useRef<string>(''); // 방 코드를 ref로 저장하여 무한 루프 방지

  // 호스트 모드: 방 코드 생성 및 서버 연결 (한 번만 실행)
  useEffect(() => {
    // 호스트가 아니면 무시
    if (!isHost) return;

    // 이미 연결되었거나 연결 중이면 무시
    if (hasConnectedRef.current || connectingRef.current) {
      console.log('[RoomScreen] 호스트 모드: 이미 연결 중이거나 연결됨', { 
        hasConnected: hasConnectedRef.current, 
        connecting: connectingRef.current,
        status
      });
      return;
    }

    // 이미 연결된 상태면 무시
    if (status === 'connected') {
      console.log('[RoomScreen] 호스트 모드: 이미 연결됨');
      hasConnectedRef.current = true;
      return;
    }

    console.log('[RoomScreen] 호스트 모드: 방 생성 시작');
    
    // 방 코드 생성 (없는 경우에만)
    // ref에 저장된 값 또는 현재 roomCode 또는 initialRoomCode 사용
    let finalRoomCode = roomCodeRef.current || roomCode || initialRoomCode;
    if (!finalRoomCode) {
      finalRoomCode = generateRoomCode();
      console.log('[RoomScreen] 방 코드 생성:', finalRoomCode);
      // ref에 저장 (무한 루프 방지)
      roomCodeRef.current = finalRoomCode;
      // App.tsx의 state도 업데이트 (UI 표시용)
      onSetRoomCode(finalRoomCode);
    } else {
      // 방 코드가 이미 있으면 ref에도 저장
      roomCodeRef.current = finalRoomCode;
    }

    // 서버에 방 생성
    connectingRef.current = true;
    const connectOptions = {
      name: nickname,
      mode: 'custom' as const,
      roomCode: finalRoomCode,
      isHost: true,
      maxPlayers: maxPlayers,
    };

    console.log('[RoomScreen] 서버 연결 시도:', connectOptions);
    connect(connectOptions).then(() => {
      console.log('[RoomScreen] 호스트: 서버 연결 성공');
      hasConnectedRef.current = true;
      connectingRef.current = false;
      // 연결 성공 후에만 roomCode state 업데이트 (무한 루프 방지)
      if (!roomCode || roomCode !== finalRoomCode) {
        setRoomCode(finalRoomCode);
      }
    }).catch((error) => {
      console.error('[RoomScreen] 호스트: 서버 연결 실패:', error);
      toast.error('방 생성에 실패했습니다. 다시 시도해주세요.');
      hasConnectedRef.current = false;
      connectingRef.current = false;
      // 실패 시 ref 초기화
      roomCodeRef.current = '';
    });

    return () => {
      // cleanup: 화면 전환 시에는 연결을 유지하므로 disconnect()를 호출하지 않음
      // 뒤로가기 버튼을 눌렀을 때만 disconnect() 호출
      console.log('[RoomScreen] 호스트 모드: cleanup 실행 (연결 유지)');
      // 연결은 유지하고 ref만 초기화하지 않음 (다른 화면에서도 사용 가능)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]); // isHost만 dependency로 사용 (한 번만 실행)

  // 게임 상태에서 플레이어 목록 및 maxPlayers 동기화
  useEffect(() => {
    if (!gameState || !gameState.players) return;

    console.log('[RoomScreen] 플레이어 목록 동기화:', gameState.players.size);
    
    const playersList: Player[] = [];
    gameState.players.forEach((playerInfo, playerId) => {
      playersList.push({
        id: playerId,
        nickname: playerInfo.nickname || 'Unknown',
        isReady: playerInfo.isReady || false,
        isHost: playerInfo.isHost || false,
        character: playerInfo.characterId || undefined,
      });
    });

    // 세션 ID 기준으로 정렬 (호스트가 첫 번째)
    playersList.sort((a, b) => {
      if (a.isHost) return -1;
      if (b.isHost) return 1;
      return 0;
    });

    setPlayers(playersList);
    console.log('[RoomScreen] 플레이어 목록 업데이트:', playersList);

    // maxPlayers 동기화 (서버에서 받은 값으로 업데이트)
    if (gameState.maxPlayers && gameState.maxPlayers !== maxPlayers) {
      console.log('[RoomScreen] maxPlayers 동기화:', gameState.maxPlayers);
      setMaxPlayersLocal(gameState.maxPlayers);
      onSetPlayerCount(gameState.maxPlayers);
    }
  }, [gameState?.players, gameState?.status, gameState?.maxPlayers, maxPlayers, onSetPlayerCount]);

  // 캐릭터 선택 화면으로 이동하는 메시지 리스닝
  useEffect(() => {
    if (status !== 'connected') return;

    console.log('[RoomScreen] 캐릭터 선택 메시지 리스너 등록');
    const cleanup = onMessage('character_select', () => {
      console.log('[RoomScreen] 캐릭터 선택 메시지 수신. 캐릭터 선택 화면으로 이동');
      onNavigateToCharacterSelect();
    });
    return cleanup;
  }, [status, onMessage, onNavigateToCharacterSelect]);

  const emptySlots = Math.max(0, maxPlayers - players.length);
  const hasEnoughPlayers = players.length >= 2;
  // 호스트를 제외한 모든 플레이어가 준비되었는지 확인 (호스트는 항상 ready로 간주)
  const allNonHostReady = players.filter(p => !p.isHost).length > 0 
    ? players.filter(p => !p.isHost).every(p => p.isReady)
    : true; // 호스트만 있으면 true
  const canStart = isHost && allNonHostReady && hasEnoughPlayers && gameState?.status === 'LOBBY';

  const handleAddSlot = () => {
    if (maxPlayers < 5) {
      const newMax = maxPlayers + 1;
      setMaxPlayersLocal(newMax);
      onSetPlayerCount(newMax);
      // 서버에 즉시 반영
      if (sendMessage && isHost) {
        sendMessage('update_max_players', { maxPlayers: newMax });
      }
    }
  };

  const handleRemoveSlot = () => {
    if (maxPlayers <= 2) {
      toast.error('최소 인원은 2명입니다.');
      return;
    }
    const newMax = maxPlayers - 1;
    setMaxPlayersLocal(newMax);
    onSetPlayerCount(newMax);
    // 서버에 즉시 반영
    if (sendMessage && isHost) {
      sendMessage('update_max_players', { maxPlayers: newMax });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success(`방 코드 "${roomCode}"가 클립보드에 복사되었습니다!`);
    } catch (error) {
      console.error('[RoomScreen] 클립보드 복사 실패:', error);
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  const handleJoinRoom = async () => {
    const trimmedCode = inviteCodeInput.trim().toUpperCase();
    if (!trimmedCode) {
      setInviteCodeError('초대 코드를 입력해주세요.');
      return;
    }
    
    if (trimmedCode.length !== 6) {
      setInviteCodeError('방 코드는 6자리여야 합니다.');
      return;
    }

    if (connectingRef.current) {
      toast.info('이미 연결 중입니다...');
      return;
    }

    console.log('[RoomScreen] 게스트 모드: 방 조인 시도. 방 코드:', trimmedCode);
    setInviteCodeError('');
    connectingRef.current = true;

    try {
      await connect({
        name: nickname,
        mode: 'custom',
        roomCode: trimmedCode,
        isHost: false,
      });
      
      console.log('[RoomScreen] 게스트: 서버 연결 성공');
      setRoomCode(trimmedCode);
      onSetRoomCode(trimmedCode);
      hasConnectedRef.current = true;
      connectingRef.current = false;
    } catch (error) {
      console.error('[RoomScreen] 게스트: 서버 연결 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '방 참여에 실패했습니다.';
      setInviteCodeError(errorMessage.includes('존재하지 않는 방') ? errorMessage : '방 참여에 실패했습니다.');
      connectingRef.current = false;
    }
  };

  const handleReady = () => {
    if (!sessionId || !sendMessage) {
      toast.error('서버에 연결되지 않았습니다.');
      return;
    }

    const currentPlayer = players.find(p => p.id === sessionId);
    const newReadyState = !currentPlayer?.isReady;
    
    console.log('[RoomScreen] Ready 상태 변경:', newReadyState);
    sendMessage('ready', {});
    // toast는 서버에서 상태가 업데이트되면 자동으로 반영되므로 제거
  };

  const currentPlayer = players.find(p => p.id === sessionId);

  // Guest mode: Show invite code input (서버에 연결되지 않은 경우)
  if (!isHost && !hasConnectedRef.current && status !== 'connected') {
    return (
      <LandscapeLayout>
        <div 
          className="size-full flex flex-col items-center justify-center p-4 sm:p-8 relative bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/Lobby_background.png)',
          }}
        >
          {/* Header - Top Left */}
          <div className="absolute top-4 left-16 flex items-center gap-2">
            <span className="text-white text-3xl font-bold">맞춤 게임</span>
          </div>

          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-white/10 shadow-2xl">
            <h2 className="text-3xl text-white text-center mb-8 font-bold">방 참여하기</h2>

            <div className="space-y-6">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  setInviteCodeError('');
                }}
                placeholder="방 코드 입력"
                maxLength={6}
                className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gray-300 uppercase font-mono"
              />

              {inviteCodeError && (
                <p className="text-red-300 text-center text-sm">{inviteCodeError}</p>
              )}

              <button
                onClick={handleJoinRoom}
                className="w-full px-8 py-4 bg-gray-300 hover:bg-gray-200 text-gray-900 text-xl font-bold rounded-xl transition-all shadow-lg border-b-4 border-gray-400 active:border-b-0 active:translate-y-1"
              >
                참여하기
              </button>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    );
  }

  // Room view (for both host and guest after joining)
  return (
    <LandscapeLayout>
      <div 
        className="size-full flex flex-col items-center p-4 sm:p-8 relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Lobby_background.png)',
        }}
      >
        {/* Header - Top Left */}
        <div className="absolute top-4 left-16 flex items-center gap-2">
          <span className="text-white text-3xl font-bold">맞춤 게임</span>
        </div>

        {/* Top Right - Room Code and Max Players */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="bg-gray-300 px-6 py-2 rounded-full text-gray-900 font-bold text-xl">
            방 코드: {roomCode}
          </div>
          <div className="bg-gray-300 px-4 py-2 rounded-full text-gray-900 font-bold text-lg">
            최대 인원: {maxPlayers}명
          </div>
          <button
            onClick={handleShare}
            className="p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
            title="방 코드 복사"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {
            console.log('[RoomScreen] 뒤로가기 버튼 클릭');
            // 연결 해제 및 상태 초기화
            disconnect();
            hasConnectedRef.current = false;
            connectingRef.current = false;
            // 방 코드 초기화 (새 방을 만들 때 새 코드 발급받기 위해)
            if (isHost) {
              setRoomCode('');
              onSetRoomCode('');
            }
            onBack();
          }}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="w-full max-w-5xl mt-20 flex-1 flex flex-col justify-center">
          {/* 연결 상태 표시 */}
          {status === 'connecting' && (
            <div className="text-center mb-4">
              <p className="text-white/80 text-sm">서버에 연결 중...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center mb-4">
              <p className="text-red-300 text-sm">연결 오류가 발생했습니다.</p>
            </div>
          )}
          
          {/* Player slots grid */}
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            {players.map((player) => (
              <div
                key={player.id}
                className="w-44 aspect-[3/4] bg-white rounded-xl p-2 flex flex-col items-center relative shadow-lg"
              >
                {/* Avatar */}
                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="font-bold text-gray-900 text-lg truncate w-full text-center">{player.nickname}</p>

                {/* Status Badge */}
                {player.isHost ? (
                  <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-1 shadow-sm">
                    <span className="text-xs">👑</span>
                  </div>
                ) : player.isReady && (
                  <div className="absolute top-1 right-1 bg-black rounded-full p-1">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className={`w-44 aspect-[3/4] bg-gray-700/80 rounded-xl p-2 flex flex-col items-center justify-center relative transition-colors ${isHost ? 'hover:bg-gray-700 group cursor-pointer' : ''}`}
                onClick={isHost ? handleRemoveSlot : undefined}
                role={isHost ? "button" : undefined}
                tabIndex={isHost ? 0 : undefined}
              >
                {isHost ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mb-2 group-hover:bg-red-500/20 transition-colors">
                      <X className="w-10 h-10 text-white/50 group-hover:text-red-400 transition-colors" />
                    </div>
                    <p className="text-white/50 text-lg font-bold group-hover:text-red-300 transition-colors">Empty</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mb-2">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30" />
                    </div>
                    <p className="text-white/50 text-lg font-bold">Empty</p>
                  </>
                )}
              </div>
            ))}

            {/* Add slot button */}
            {isHost && maxPlayers < 5 && (
              <div
                className="w-44 aspect-[3/4] bg-gray-400/50 hover:bg-gray-400/80 rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-lg"
                onClick={handleAddSlot}
              >
                <Plus className="w-12 h-12 text-gray-800" />
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => {
                  console.log('[RoomScreen] 호스트가 Start 버튼 클릭');
                  if (canStart && sendMessage) {
                    // 서버에 게임 시작 요청 전송
                    sendMessage('start_game', {});
                  } else {
                    toast.error(`게임 시작 조건을 만족하지 않습니다. (플레이어: ${players.length}명, 준비: ${allNonHostReady ? '완료' : '대기'})`);
                  }
                }}
                disabled={!canStart || status !== 'connected'}
                className={`px-12 py-3 text-xl font-bold rounded-lg transition-all shadow-lg ${canStart && status === 'connected'
                  ? 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                  : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                  }`}
                title={!canStart ? `게임 시작 조건: 최소 2명 이상, 모든 플레이어 준비 완료 (현재: ${players.length}명, 준비: ${players.filter(p => !p.isHost && p.isReady).length}/${players.filter(p => !p.isHost).length}명)` : ''}
              >
                Start
              </button>
            ) : (
              <button
                onClick={handleReady}
                disabled={!sessionId || status !== 'connected'}
                className={`px-12 py-3 text-xl font-bold rounded-lg transition-all shadow-lg ${currentPlayer?.isReady
                  ? 'bg-gray-500 text-white border-b-4 border-gray-600 active:border-b-0 active:translate-y-1'
                  : 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                  } ${!sessionId || status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentPlayer?.isReady ? 'Ready 취소' : 'Ready'}
              </button>
            )}
          </div>
          
          {/* 디버그 정보 (개발용) */}
          {(import.meta as any).env?.MODE === 'development' && (
            <div className="text-center mt-4 text-white/50 text-xs">
              <p>연결 상태: {status} | 플레이어: {players.length}명 | 세션: {sessionId?.substring(0, 8) || 'none'}</p>
            </div>
          )}
        </div>
      </div>
    </LandscapeLayout>
  );
}
