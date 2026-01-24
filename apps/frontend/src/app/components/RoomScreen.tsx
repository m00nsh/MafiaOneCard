import { useState, useEffect } from 'react';
import { Share2, X, Plus, ArrowLeft, Check } from 'lucide-react';

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
  onStart: () => void;
  onBack: () => void;
  onSetRoomCode: (code: string) => void;
  onSetPlayerCount: (count: number) => void;
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
  onStart, 
  onBack,
  onSetRoomCode,
  onSetPlayerCount 
}: RoomScreenProps) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [maxPlayers, setMaxPlayersLocal] = useState(initialMaxPlayers);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId] = useState('current-player');

  // Initialize room code and players
  useEffect(() => {
    if (isHost) {
      // Host mode: generate room code if not exists
      if (!roomCode) {
        const newCode = generateRoomCode();
        setRoomCode(newCode);
        onSetRoomCode(newCode);
      }
      // Initialize with host player
      setPlayers([{
        id: currentPlayerId,
        nickname: nickname,
        isReady: true, // Host is always ready
        isHost: true,
      }]);
    } else {
      // Guest mode: show invite code input
    }
  }, []);

  const emptySlots = Math.max(0, maxPlayers - players.length);
  // All non-host players must be ready and room must be full
  const allNonHostReady = players.filter(p => !p.isHost).every(p => p.isReady);
  const roomIsFull = players.length === maxPlayers;
  const hasEnoughPlayers = players.length >= 2;
  const canStart = isHost && allNonHostReady && roomIsFull && hasEnoughPlayers;

  const handleAddSlot = () => {
    if (maxPlayers < 5) {
      const newMax = maxPlayers + 1;
      setMaxPlayersLocal(newMax);
      onSetPlayerCount(newMax);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '원카드 배틀 초대',
        text: `방 코드: ${roomCode}`,
      });
    } else {
      navigator.clipboard.writeText(roomCode);
      alert('초대 코드가 복사되었습니다!');
    }
  };

  const handleJoinRoom = () => {
    const trimmedCode = inviteCodeInput.trim().toUpperCase();
    
    if (!trimmedCode) {
      setInviteCodeError('초대 코드를 입력해주세요.');
      return;
    }

    // Mock validation - in real app, this would check with server
    // For now, accept any 6-character code
    if (trimmedCode.length !== 6) {
      setInviteCodeError('존재하지 않는 방입니다.');
      return;
    }

    // Join room successful
    setRoomCode(trimmedCode);
    onSetRoomCode(trimmedCode);
    setInviteCodeError('');
    
    // Initialize with current player as non-host
    setPlayers([
      {
        id: 'host',
        nickname: 'Player 1',
        isReady: true,
        isHost: true,
      },
      {
        id: currentPlayerId,
        nickname: nickname,
        isReady: false,
        isHost: false,
      }
    ]);
  };

  const handleReady = () => {
    setPlayers(prev => prev.map(p => 
      p.id === currentPlayerId ? { ...p, isReady: !p.isReady } : p
    ));
  };

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Guest mode: Show invite code input
  if (!isHost && players.length === 0) {
    return (
      <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="bg-green-800/50 rounded-2xl p-6 sm:p-8 max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl text-white text-center mb-6">방 참여하기</h2>
          
          <div className="space-y-4">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => {
                setInviteCodeInput(e.target.value.toUpperCase());
                setInviteCodeError('');
              }}
              placeholder="초대 코드 입력"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-xl tracking-widest rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white/60 uppercase"
            />
            
            {inviteCodeError && (
              <p className="text-red-300 text-center text-sm">{inviteCodeError}</p>
            )}

            <button
              onClick={handleJoinRoom}
              className="w-full px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 text-xl rounded-xl transition-all shadow-lg"
            >
              참여하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room view (for both host and guest after joining)
  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-4 sm:p-8 overflow-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors z-10"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      <div className="w-full max-w-6xl mt-12 sm:mt-0">
        {/* Header with room code */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl text-white">맞춤 게임</h2>
          <div className="bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="text-white text-sm sm:text-base">초대 코드: {roomCode}</span>
            {isHost && (
              <button 
                onClick={handleShare}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Player slots */}
        <div className="bg-green-800/50 rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-lg p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative"
              >
                {/* Player avatar placeholder */}
                <div className="w-16 h-20 sm:w-24 sm:h-32 bg-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-2xl sm:text-4xl">👤</span>
                </div>
                
                {/* Player nickname */}
                <div className="text-center w-full">
                  <p className="font-medium text-xs sm:text-base truncate">{player.nickname}</p>
                  {player.isHost && (
                    <span className="text-xs text-blue-600">(방장)</span>
                  )}
                </div>

                {/* Ready checkmark indicator */}
                {player.isReady && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <div className="bg-green-500 rounded-full p-1">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-white/20 border-2 border-dashed border-white/40 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 min-h-[120px] sm:min-h-[180px]"
              >
                {isHost && index === 0 && maxPlayers < 5 ? (
                  <button 
                    onClick={handleAddSlot}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-white/10 rounded transition-colors"
                  >
                    <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    <span className="text-white text-xs sm:text-sm">슬롯 추가</span>
                  </button>
                ) : (
                  <>
                    <div className="w-16 h-20 sm:w-24 sm:h-32 bg-gray-600/50 rounded-lg"></div>
                    <p className="text-white/60 text-xs sm:text-sm">Empty</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={!canStart}
              className="px-12 sm:px-16 py-4 sm:py-6 bg-white hover:bg-gray-100 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 text-xl sm:text-2xl rounded-xl transition-all shadow-lg"
              title={!canStart ? '모든 플레이어가 준비되고 방이 꽉 차야 시작할 수 있습니다' : ''}
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleReady}
              className={`px-12 sm:px-16 py-4 sm:py-6 text-xl sm:text-2xl rounded-xl transition-all shadow-lg ${
                currentPlayer?.isReady
                  ? 'bg-gray-400 hover:bg-gray-500 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-900'
              }`}
            >
              {currentPlayer?.isReady ? 'Ready 취소' : 'Ready'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
