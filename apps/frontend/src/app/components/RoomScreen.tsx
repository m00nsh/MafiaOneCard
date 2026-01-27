import { useState, useEffect } from 'react';
import { Share2, X, Plus, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

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
      if (!roomCode) {
        const newCode = generateRoomCode();
        setRoomCode(newCode);
        onSetRoomCode(newCode);
      }
      setPlayers([{
        id: currentPlayerId,
        nickname: nickname,
        isReady: true, // Host is always ready
        isHost: true,
      }]);
    }
  }, []);

  const emptySlots = Math.max(0, maxPlayers - players.length);
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

  const handleRemoveSlot = () => {
    if (maxPlayers <= 2) {
      toast.error('최소 인원은 2명입니다.');
      return;
    }
    const newMax = maxPlayers - 1;
    setMaxPlayersLocal(newMax);
    onSetPlayerCount(newMax);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '원카드 배틀 초대',
        text: `방 코드: ${roomCode}`,
      });
    } else {
      navigator.clipboard.writeText(roomCode);
      toast.success('초대 코드가 복사되었습니다!');
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
    setPlayers([
      { id: 'host', nickname: 'Player 1', isReady: true, isHost: true },
      { id: currentPlayerId, nickname: nickname, isReady: false, isHost: false }
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

        {/* Top Right - Room Code */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="bg-gray-300 px-6 py-2 rounded-full text-gray-900 font-bold text-xl">
            방 코드: {roomCode}
          </div>
          {isHost && (
            <button
              onClick={handleShare}
              className="p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="w-full max-w-5xl mt-20 flex-1 flex flex-col justify-center">
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
                className="w-44 aspect-[3/4] bg-gray-700/80 rounded-xl p-2 flex flex-col items-center justify-center relative hover:bg-gray-700 transition-colors group"
                onClick={isHost ? handleRemoveSlot : undefined}
                role={isHost ? "button" : undefined}
                tabIndex={0}
              >
                <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mb-2 group-hover:bg-red-500/20 transition-colors">
                  <X className="w-10 h-10 text-white/50 group-hover:text-red-400 transition-colors" />
                </div>
                <p className="text-white/50 text-lg font-bold group-hover:text-red-300 transition-colors">Empty</p>
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
                onClick={onStart}
                disabled={!canStart}
                className={`px-12 py-3 text-xl font-bold rounded-lg transition-all shadow-lg ${canStart
                  ? 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                  : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                  }`}
                title={!canStart ? '모든 플레이어가 준비되고 방이 꽉 차야 시작할 수 있습니다' : ''}
              >
                Start
              </button>
            ) : (
              <button
                onClick={handleReady}
                className={`px-12 py-3 text-xl font-bold rounded-lg transition-all shadow-lg ${currentPlayer?.isReady
                  ? 'bg-gray-500 text-white border-b-4 border-gray-600 active:border-b-0 active:translate-y-1'
                  : 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
                  }`}
              >
                {currentPlayer?.isReady ? 'Ready 취소' : 'Ready'}
              </button>
            )}
          </div>
        </div>
      </div>
    </LandscapeLayout>
  );
}
