import { useState, useEffect, useMemo, useRef } from 'react';
import PlayingCard from '@/app/components/PlayingCard';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { Card } from '@/app/utils/gameLogic'; // UICard 타입
import { useColyseusRoom } from '@/app/hooks/useColyseusRoom';
import { useToast } from '@/app/hooks/useToast';
import { DEBUG } from '@/app/config/server';
import { cardFromUI, suitToUI } from '@/app/utils/cardConverter';
import { CardPlayMessage, DrawCardMessage, CardPlayResponseMessage, DrawCardResponseMessage, CardSuit, GameEndMessage, CHARACTER_SKILLS, CharacterId } from '@mafia/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
// Note: createDeck은 서버에서 처리하므로 제거됨

// Mock Data Types
interface Player {
  id: string;
  name: string;
  character: string;
  cardCount: number;
  position: 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
}

interface GameScreenProps {
  playerCount: number;
  selectedCharacters: string[];
  nickname: string;
  onBackToMain?: () => void;
}

// Visual component for Opponent's Hand (Stacked)
const OpponentHandVisual = ({ count, isLeft }: { count: number; isLeft: boolean }) => {
  // Cap the visual stack to avoid rendering too many DOM elements
  // 10장을 초과하면 "+" 표기로 변경
  const VISUAL_CAP = 10;
  const renderCount = Math.min(count, VISUAL_CAP);
  const OFFSET_PX = 12; // Card spacing

  return (
    <div className="relative w-20 h-28" style={{ width: `calc(5rem + ${(renderCount - 1) * OFFSET_PX}px)` }}>
      {Array.from({ length: renderCount }).map((_, index) => {
        // Stack logic: Corner-side card is on top (index 0)
        // Left side: Index 0 is at left:0. Index 1 at left:offset. Z-index decreases.
        // Right side: Index 0 is at right:0. Index 1 at right:offset. Z-index decreases.
        const style: React.CSSProperties = isLeft
          ? {
            left: `${index * OFFSET_PX}px`,
            zIndex: renderCount - index,
          }
          : {
            right: `${index * OFFSET_PX}px`,
            zIndex: renderCount - index,
          };

        return (
          <div
            key={index}
            className="absolute top-0 w-20 h-28 transition-all duration-300"
            style={style}
          >
            <PlayingCard
              card={{ id: `opp-card-${index}`, suit: 'joker', rank: 'JOKER_BW' }}
              faceDown={true}
              className="w-full h-full shadow-md"
            />
          </div>
        );
      })}
      {/* Show count badge if more than 10 cards */}
      {count > VISUAL_CAP && (
        <div
          className={`absolute -bottom-2 ${isLeft ? 'right-0' : 'left-0'} bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-50 font-bold`}
        >
          +{count - VISUAL_CAP}
        </div>
      )}
    </div>
  );
};

// Visual component for Turn Direction
const TurnDirectionIndicator = ({ direction }: { direction: 'clockwise' | 'counter-clockwise' }) => {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10 pointer-events-none">
      {/* Left Arrow */}
      <div className={`transition-opacity duration-500 ${direction === 'counter-clockwise' ? 'opacity-100' : 'opacity-30'}`}>
        <svg
          width="60"
          height="20"
          viewBox="0 0 60 20"
          className={`overflow-visible ${direction === 'counter-clockwise' ? 'animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
        >
          <path
            d="M 58 18 Q 30 -5 2 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
          <path
            d="M 2 18 L 10 12 M 2 18 L 12 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center">
        <span className="text-white font-bold text-2xl tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          TURN
        </span>
      </div>

      {/* Right Arrow */}
      <div className={`transition-opacity duration-500 ${direction === 'clockwise' ? 'opacity-100' : 'opacity-30'}`}>
        <svg
          width="60"
          height="20"
          viewBox="0 0 60 20"
          className={`overflow-visible ${direction === 'clockwise' ? 'animate-pulse drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
        >
          <path
            d="M 2 18 Q 30 -5 58 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
          <path
            d="M 58 18 L 50 12 M 58 18 L 48 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-blue-400"
          />
        </svg>
      </div>
    </div>
  );
};

// Helper component for Opponent
const OpponentProfile = ({ player, isTurn }: { player: Player; isTurn: boolean }) => {
  const isLeft = player.position.includes('left');

  return (
    <div className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Info Box */}
      <div className={`bg-gray-300 rounded-lg p-4 min-w-[140px] sm:min-w-[160px] shadow-lg relative z-[100] transition-all duration-300
        ${isTurn ? 'border-4 border-yellow-400 scale-105' : ''}
        ${!isLeft ? 'text-right' : ''}
      `}>
        <p className="text-gray-900 font-bold text-lg sm:text-xl truncate">{player.name}</p>
        <p className="text-gray-600 text-sm sm:text-base">{`{${player.character}}`}</p>
        <p className="text-blue-600 font-bold mt-1">카드: {player.cardCount}장</p>
      </div>

      {/* Card Deck Visual */}
      <OpponentHandVisual count={player.cardCount} isLeft={isLeft} />
    </div>
  );
};

// Helper to generate mock opponents based on player count
const generateMockOpponents = (totalPlayers: number): Player[] => {
  const opponents: Player[] = [];

  // Distribution logic based on user request:
  // 2 Players (1 Opp): Left
  // 3 Players (2 Opp): Left, Right
  // 4 Players (3 Opp): Left (2), Right (1)
  // 5 Players (4 Opp): Left (2), Right (2) - Standard fallback

  const positions: Player['position'][] = [];
  if (totalPlayers === 2) {
    positions.push('left-top');
  } else if (totalPlayers === 3) {
    positions.push('left-top', 'right-top');
  } else if (totalPlayers === 4) {
    positions.push('left-top', 'left-bottom', 'right-top');
  } else {
    // 5+ Players (Default to 5 max)
    positions.push('left-top', 'left-bottom', 'right-top', 'right-bottom');
  }

  positions.forEach((pos, index) => {
    opponents.push({
      id: `op${index + 1}`,
      name: `Player ${index + 1}`,
      character: '캐릭터', // Placeholder
      cardCount: 5 + index, // Varied card counts
      position: pos
    });
  });

  return opponents;
};

export default function GameScreen({ playerCount: initialPlayerCount = 4, selectedCharacters, nickname, onBackToMain }: GameScreenProps) {
  // Colyseus 연결
  const { status, sessionId, gameState, connect, error, sendMessage, onMessage } = useColyseusRoom();
  
  // 토스트 알림 (네트워크 통신 에러만 사용)
  const { showError } = useToast();

  // 컴포넌트 마운트 시 자동 연결 (GameModeScreen에서 정한 닉네임 사용)
  useEffect(() => {
    connect({ name: nickname || `Player-${Math.random().toString(36).substr(2, 9)}` });
    
    // 언마운트 시 연결 해제는 useColyseusRoom 내부에서 처리됨
  }, [nickname, connect]);

  // 연결 상태 변경 알림 (네트워크 통신 에러만 표시)
  useEffect(() => {
    if (status === 'error') {
      showError('서버 연결에 실패했습니다', {
        description: error?.message || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      });
    }
  }, [status, error, showError]);

  // 서버 상태에서 데이터 가져오기 (없으면 Mock 데이터 사용)
  const myId = sessionId || 'me';
  const [sortMode, setSortMode] = useState<'none' | 'suit' | 'rank'>('none');

  // Mock 데이터를 상수로 정의 (매 렌더마다 생성되지 않도록)
  const MOCK_HAND: Card[] = useMemo(() => [
    { id: 'mock-1', suit: 'hearts', rank: 'A' },
    { id: 'mock-2', suit: 'spades', rank: 'K' },
    { id: 'mock-3', suit: 'diamonds', rank: 'Q' },
    { id: 'mock-4', suit: 'clubs', rank: 'J' },
    { id: 'mock-5', suit: 'hearts', rank: '10' },
    { id: 'mock-6', suit: 'spades', rank: '7' },
    { id: 'mock-7', suit: 'diamonds', rank: '3' },
  ], []);

  // 게임 상태 및 준비 상태 (먼저 정의)
  const gameStatus = gameState?.status || 'LOBBY';
  const isLobby = gameStatus === 'LOBBY';
  const isPlaying = gameStatus === 'PLAYING';
  const isEnded = gameStatus === 'ENDED';
  
  // 서버 상태가 있으면 사용, 없으면 Mock 데이터 (메모이제이션)
  // 게임이 시작되면 서버에서 받은 카드만 사용
  const myHand = useMemo(() => {
    if (isPlaying && gameState?.myHand) {
      return gameState.myHand;
    }
    // LOBBY 상태일 때는 Mock 데이터 사용
    return gameState?.myHand || MOCK_HAND;
  }, [isPlaying, gameState?.myHand, MOCK_HAND]);

  // topCard: 게임이 시작되면 서버에서 받은 카드 사용, 아니면 Mock 데이터
  const topCard = useMemo(() => {
    if (isPlaying && gameState?.topCard) {
      return gameState.topCard;
    }
    // LOBBY 상태일 때는 Mock 데이터 사용
    return { id: 'top', suit: 'clubs' as const, rank: 'A' as const };
  }, [isPlaying, gameState?.topCard]);
  
  const deckCount = gameState?.deckCount ?? 25;
  const attackStack = gameState?.attackStack ?? 0;
  const direction = gameState?.direction || 'clockwise';
  const currentTurn = gameState?.currentTurn || null;
  // selectedSuit는 7 카드 사용 시 필요 (향후 구현)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedSuit = gameState?.selectedSuit || null;
  const isMyTurn = currentTurn === myId && isPlaying;
  const myReadyState = gameState?.myPlayer?.isReady || false;
  const winnerId = gameState?.winnerId || null;
  
  // 모든 플레이어 준비 상태 확인
  const allPlayersReady = gameState?.players 
    ? Array.from(gameState.players.values()).every(p => p.isReady)
    : false;
  const currentPlayerCount = gameState?.players?.size || 0;
  const canStartGame = isLobby && allPlayersReady && currentPlayerCount >= 2;


  // 서버 응답 메시지 리스너 등록
  useEffect(() => {
    if (!onMessage) return;
    
    // 카드 내기 응답 처리
    onMessage<CardPlayResponseMessage>('card_play_response', (response) => {
      if (response.success) {
        if (DEBUG) {
          console.log('[GameScreen] 카드 내기 성공:', response);
        }
        // 상태 동기화로 자동 업데이트됨
      } else {
        console.error('[GameScreen] 카드 내기 실패:', response.error);
        // 에러는 콘솔에만 기록 (네트워크 통신 에러가 아니므로 토스트 표시 안 함)
      }
    });
    
    // 카드 뽑기 응답 처리
    onMessage<DrawCardResponseMessage>('draw_card_response', (response) => {
      if (response.success) {
        if (DEBUG) {
          console.log('[GameScreen] 카드 뽑기 성공:', response);
        }
        // 상태 동기화로 자동 업데이트됨
      } else {
        console.error('[GameScreen] 카드 뽑기 실패:', response.error);
        // 에러는 콘솔에만 기록 (네트워크 통신 에러가 아니므로 토스트 표시 안 함)
      }
    });

    // 게임 종료 메시지 처리
    onMessage<GameEndMessage>('game_end', (message) => {
      console.log('[GameScreen] 게임 종료:', message);
      
      // 본인의 등수 가져오기
      const currentMyId = sessionId || 'me';
      const myStats = message.stats[currentMyId];
      const myRank = myStats?.rank || 0;
      
      // 통계 창 표시
      setGameEndData({
        myRank,
        winnerId: message.winnerId,
        reason: message.reason,
      });
      setShowStatsDialog(true);
    });
  }, [onMessage, sessionId]);
  
  // 준비 상태 토글
  const handleToggleReady = () => {
    if (!isLobby) return;
    const newReadyState = !myReadyState;
    sendMessage('ready', { isReady: newReadyState });
    if (DEBUG) {
      console.log('[GameScreen] 준비 상태 변경:', newReadyState);
    }
  };

  // 내 캐릭터 이름 가져오기
  const myCharacterName = useMemo(() => {
    if (selectedCharacters.length > 0) {
      const characterId = selectedCharacters[0] as CharacterId;
      return CHARACTER_SKILLS[characterId]?.name || '캐릭터';
    }
    return '캐릭터';
  }, [selectedCharacters]);

  // 서버에서 받은 플레이어 정보를 Opponent 형식으로 변환
  // 시계 방향으로 턴 순서대로 배치: 플레이어 수에 따라 위치 결정
  const opponents: Player[] = useMemo(() => {
    if (!gameState?.players) {
      return generateMockOpponents(initialPlayerCount);
    }

    const allPlayerIds = Array.from(gameState.players.keys());
    const myIndex = allPlayerIds.indexOf(myId);
    const opponentCount = allPlayerIds.length - 1; // 내 자신 제외
    
    // 내 자신을 기준으로 시계 방향 순서 생성
    // 예: 내가 0번이면 [1, 2, 3], 내가 1번이면 [2, 3, 0]
    const orderedOpponentIds: string[] = [];
    for (let i = 1; i < allPlayerIds.length; i++) {
      const nextIndex = (myIndex + i) % allPlayerIds.length;
      orderedOpponentIds.push(allPlayerIds[nextIndex]);
    }

    // 플레이어 수에 따른 위치 배치
    // 2명 (opponents 1명): 좌 1 (left-top)
    // 3명 (opponents 2명): 좌 1, 우 1 (left-top, right-top)
    // 4명 (opponents 3명): 좌 2, 우 1 (left-top, left-bottom, right-top)
    // 5명 (opponents 4명): 좌 2, 우 2 (left-top, left-bottom, right-top, right-bottom)
    const positions: Player['position'][] = [];
    if (opponentCount === 1) {
      positions.push('left-top');
    } else if (opponentCount === 2) {
      positions.push('left-top', 'right-top');
    } else if (opponentCount === 3) {
      positions.push('left-top', 'left-bottom', 'right-top');
    } else {
      // 4명 이상
      positions.push('left-top', 'left-bottom', 'right-top', 'right-bottom');
    }

    return orderedOpponentIds.map((id, index) => {
      const playerInfo = gameState.players.get(id);
      if (!playerInfo) return null;
      
      // 캐릭터 이름 가져오기
      const characterId = playerInfo.characterId as CharacterId | undefined;
      const characterName = characterId && CHARACTER_SKILLS[characterId] 
        ? CHARACTER_SKILLS[characterId].name 
        : '캐릭터';
      
      return {
        id,
        name: playerInfo.nickname || `Player ${index + 1}`,
        character: characterName,
        cardCount: playerInfo.handCount || 0,
        position: positions[index] || 'left-top',
      };
    }).filter((p): p is Player => p !== null);
  }, [gameState?.players, myId, initialPlayerCount]);

  // Mock Skill State
  const maxSkillCooldown = 3;
  const [currentSkillCharge, setCurrentSkillCharge] = useState(1);

  // 7 카드 수트 선택 상태
  const [showSuitDialog, setShowSuitDialog] = useState(false);
  const [pendingCard, setPendingCard] = useState<{ card: Card; index: number } | null>(null);
  
  // 게임 종료 통계 창 상태
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [gameEndData, setGameEndData] = useState<{ myRank: number; winnerId: string; reason: string } | null>(null);

  // Sorting Logic Helpers
  const SUIT_ORDER: Record<string, number> = { 'spades': 0, 'diamonds': 1, 'hearts': 2, 'clubs': 3, 'joker': 4 };
  const RANK_ORDER: Record<string, number> = {
    'A': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12,
    'JOKER_BW': 13, 'JOKER_COLOR': 14
  };

  const getSortComparator = (mode: 'suit' | 'rank') => (a: Card, b: Card) => {
    const getSuitVal = (c: Card) => SUIT_ORDER[c.suit] ?? 99;
    const getRankVal = (c: Card) => RANK_ORDER[c.rank] ?? 99;

    if (mode === 'suit') {
      const sA = getSuitVal(a);
      const sB = getSuitVal(b);
      if (sA !== sB) return sA - sB;
      return getRankVal(a) - getRankVal(b);
    } else {
      // Rank -> Suit
      const rA = getRankVal(a);
      const rB = getRankVal(b);
      if (rA !== rB) return rA - rB;
      return getSuitVal(a) - getSuitVal(b);
    }
  };

  // 정렬된 핸드 상태 관리 (서버 상태와 분리)
  const [sortedHand, setSortedHand] = useState<Card[]>(myHand);
  
  // 이전 myHand 참조를 저장하여 실제 변경 여부 확인
  const prevHandRef = useRef<Card[]>(myHand);

  // 서버 상태가 변경되면 정렬된 핸드도 업데이트
  // 배열의 참조가 아닌 내용을 비교하여 실제 변경 시에만 업데이트
  useEffect(() => {
    // 배열 길이와 각 카드의 id를 비교하여 실제 변경 여부 확인
    const hasChanged = 
      prevHandRef.current.length !== myHand.length ||
      prevHandRef.current.some((card, index) => 
        card.id !== myHand[index]?.id
      );

    if (hasChanged) {
      setSortedHand([...myHand]); // 새 배열로 복사
      prevHandRef.current = myHand;
    }
  }, [myHand]);

  const sortHand = (mode: 'suit' | 'rank') => {
    setSortedHand(prev => [...prev].sort(getSortComparator(mode)));
  };

  const handleToggleSort = () => {
    setSortMode(prev => {
      if (prev === 'none') {
        sortHand('suit');
        return 'suit';
      }
      if (prev === 'suit') {
        sortHand('rank');
        return 'rank';
      }
      // rank -> none
      return 'none';
      // Note: 'none' doesn't un-sort, just enables manual drag (future DnD)
    });
  };

  // 카드 내기
  const handlePlayCard = (index: number) => {
    if (!isMyTurn || !isPlaying) return; // 내 턴이 아니거나 게임 중이 아니면 무시

    const card = sortedHand[index];
    if (!card) return;

    // 7 카드인 경우 수트 선택 팝업 표시
    if (card.rank === '7') {
      setPendingCard({ card, index });
      setShowSuitDialog(true);
      return;
    }

    // 일반 카드 내기
    playCardWithSuit(card, undefined);
  };

  // 수트 선택 후 카드 내기
  const playCardWithSuit = (card: Card, selectedSuit?: CardSuit) => {
    if (!card) return;

    // UI 카드를 서버 카드로 변환
    const serverCard = cardFromUI(card);
    
    // 서버로 card_play 메시지 전송
    const message: CardPlayMessage = {
      cardId: card.id,
      suit: serverCard.suit,
      rank: serverCard.rank,
      selectedSuit: selectedSuit, // 7 카드 사용 시 선택한 문양
    };

    sendMessage('card_play', message);
    
    if (DEBUG) {
      console.log('[GameScreen] 카드 내기:', card.id, message);
    }

    // 다이얼로그 닫기
    setShowSuitDialog(false);
    setPendingCard(null);
  };

  // 수트 선택 핸들러
  const handleSuitSelect = (suit: CardSuit) => {
    if (pendingCard) {
      playCardWithSuit(pendingCard.card, suit);
    }
  };

  const handleDrawCard = () => {
    if (!isMyTurn || !isPlaying) return; // 내 턴이 아니거나 게임 중이 아니면 무시

    // 서버로 draw_card 메시지 전송
    const message: DrawCardMessage = {};
    sendMessage('draw_card', message);
    
    if (DEBUG) {
      console.log('[GameScreen] 카드 뽑기 요청');
    }
    
    // 서버에서 카드를 뽑아서 플레이어 핸드에 추가하면
    // 상태 동기화를 통해 자동으로 myHand가 업데이트됨
  };

  // Dynamic Hand Spacing Logic
  const calculateOverlap = () => {
    const CARD_WIDTH = 112; // Updated width (7rem = 112px) - 본인 손패 카드 크기
    const CONTAINER_MAX_WIDTH = 760; // Max width for hand area (widened from 600)

    if (sortedHand.length <= 1) return 0;

    // Default overlap: ~56px (showing 56px strip per card) - 카드 크기에 비례하여 조정
    const STANDARD_OVERLAP = 56;
    const standardTotalWithOverlap = CARD_WIDTH + (sortedHand.length - 1) * (CARD_WIDTH - STANDARD_OVERLAP);

    if (standardTotalWithOverlap <= CONTAINER_MAX_WIDTH) {
      return STANDARD_OVERLAP;
    }

    // If it exceeds, calculate needed overlap to squeeze EXACTLY into MAX_WIDTH
    // MaxWidth = CardWidth + (N-1) * (CardWidth - Overlap)
    // Overlap = CardWidth - ((MaxWidth - CardWidth) / (N-1))
    const requiredOverlap = CARD_WIDTH - ((CONTAINER_MAX_WIDTH - CARD_WIDTH) / (sortedHand.length - 1));
    return Math.max(0, requiredOverlap);
  };

  const overlapPx = calculateOverlap();


  return (
    <LandscapeLayout>
      <div className="size-full relative p-4 sm:p-8 flex flex-col justify-between">
        {/* Connection Status Indicator */}
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-white text-sm font-bold bg-black/60 px-2 py-1 rounded">
            {status === 'connected' ? '연결됨' :
             status === 'connecting' ? '연결 중...' :
             status === 'error' ? '연결 실패' :
             '연결 끊김'}
          </span>
          {DEBUG && sessionId && (
            <span className="text-white text-xs bg-black/60 px-2 py-1 rounded font-mono">
              {sessionId.substring(0, 8)}
            </span>
          )}
        </div>
        {error && (
          <div className="absolute top-12 right-2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
            <p className="font-bold">연결 오류</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Header Title replaced by Turn Indicator */}
        <TurnDirectionIndicator direction={direction} />

        {/* Lobby 상태: 준비 버튼 표시 */}
        {isLobby && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
            <div className="bg-black/70 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm">
              <p className="text-sm mb-2">플레이어 수: {currentPlayerCount}명</p>
              <p className="text-sm">
                {allPlayersReady 
                  ? `✅ 모든 플레이어 준비 완료! (최소 2명 필요)`
                  : `⏳ 준비 중... (${Array.from(gameState?.players?.values() || []).filter(p => p.isReady).length}/${currentPlayerCount})`}
              </p>
            </div>
            <button
              onClick={handleToggleReady}
              className={`px-8 py-3 text-lg font-bold rounded-lg transition-all shadow-lg ${
                myReadyState
                  ? 'bg-green-600 hover:bg-green-500 text-white border-b-4 border-green-700 active:border-b-0 active:translate-y-1'
                  : 'bg-gray-300 hover:bg-gray-200 text-gray-900 border-b-4 border-gray-400 active:border-b-0 active:translate-y-1'
              }`}
            >
              {myReadyState ? '✅ 준비 완료' : '⏳ 준비하기'}
            </button>
          </div>
        )}

        {/* 게임 시작 대기 메시지 */}
        {isLobby && canStartGame && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-6 py-2 rounded-lg shadow-xl backdrop-blur-sm animate-pulse">
            <p className="text-sm font-bold">게임이 곧 시작됩니다...</p>
          </div>
        )}

        {/* Top Half: Opponents */}
        <div className="flex justify-between items-start w-full mt-8 sm:mt-12">
          {/* Left Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pl-4 sm:pl-12">
            {/* 좌 상단, 좌 하단 순서로 표시 */}
            {opponents.filter(p => p.position === 'left-top').map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
            ))}
            {opponents.filter(p => p.position === 'left-bottom').map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pr-4 sm:pr-12">
            {/* 우 상단, 우 하단 순서로 표시 */}
            {opponents.filter(p => p.position === 'right-top').map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
            ))}
            {opponents.filter(p => p.position === 'right-bottom').map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
            ))}
          </div>
        </div>

        {/* Center Area: Deck & Discard */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
          {/* Deck (Face Down) */}
          <div
            onClick={handleDrawCard}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleDrawCard()}
            className={`cursor-pointer flex flex-col items-center gap-2 transition-all duration-300 rounded-lg p-2
              ${isMyTurn ? 'border-2 border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-2 border-transparent'}
              ${!isMyTurn ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105'}
            `}
          >
            <PlayingCard
              card={{ id: 'deck-top', suit: 'joker', rank: 'JOKER_BW' }}
              faceDown={true}
              className="hover:scale-105 transition-transform"
              style={{ width: '7rem' }} // 본인 손패와 동일한 크기
            />
            <div className="text-center text-white font-bold bg-black/50 rounded-full px-3 py-1">
              남은 카드: {deckCount}
            </div>
          </div>

          {/* Top Card (Discard) */}
          <div className="relative flex flex-col items-center gap-2">
            <PlayingCard 
              card={topCard} 
              style={{ width: '7rem' }} // 본인 손패와 동일한 크기
            />
            {attackStack > 0 ? (
              <div className="text-center text-white font-bold bg-red-600 rounded-full px-3 py-1 shadow-lg">
                누적 공격: {attackStack}
              </div>
            ) : (
              // Placeholder to keep alignment if needed, or just conditionally render
              <div className="h-8" />
            )}
          </div>
        </div>

        {/* Bottom Area: Controls & Hand */}
        <div className="w-full flex items-end justify-between gap-4 mt-auto mb-2 relative">
          {/* 내 정보 표시 (Left) */}
          <div className="flex flex-col justify-end w-[160px] shrink-0 gap-2">
            <div className="bg-gray-300 rounded-lg p-4 min-w-[140px] sm:min-w-[160px] shadow-lg">
              <p className="text-gray-900 font-bold text-lg sm:text-xl truncate">{nickname || 'Player'}</p>
              <p className="text-gray-600 text-sm sm:text-base">{`{${myCharacterName}}`}</p>
              <p className="text-blue-600 font-bold mt-1">카드: {myHand.length}장</p>
            </div>
            <button
              onClick={handleToggleSort}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition-transform hover:scale-105 w-full whitespace-nowrap"
            >
              {sortMode === 'none' && 'Sort: Off'}
              {sortMode === 'suit' && 'Sort: Suit'}
              {sortMode === 'rank' && 'Sort: Rank'}
            </button>
          </div>

          {/* Hand Cards (Center) */}
          <div className="flex-1 flex justify-center items-end transition-all duration-300 pb-4 max-w-[760px] mx-auto min-h-[120px]">
            {sortedHand.map((card, index) => {
              // 공격 스택이 있을 때 낼 수 있는 카드만 표시
              let isPlayable = false;
              
              if (isMyTurn && isPlaying) {
                if (attackStack > 0) {
                  // 공격 스택이 있을 때: 공격 카드만 낼 수 있음
                  const topCardRank = topCard.rank;
                  const topCardSuit = topCard.suit;
                  
                  // 컬러 조커는 막을 수 없음
                  if (topCardRank === 'JOKER_COLOR') {
                    isPlayable = false;
                  }
                  // 흑백 조커는 컬러 조커로만 막을 수 있음
                  else if (topCardRank === 'JOKER_BW') {
                    isPlayable = card.rank === 'JOKER_COLOR';
                  }
                  // 2 카드: 같은 무늬 A, 다른 무늬 2, 조커
                  else if (topCardRank === '2') {
                    isPlayable = Boolean(
                      (card.rank === 'A' && card.suit === topCardSuit) ||
                      (card.rank === '2' && card.suit !== topCardSuit) ||
                      card.isJoker
                    );
                  }
                  // A 카드: 다른 무늬 A, 조커
                  else if (topCardRank === 'A') {
                    isPlayable = Boolean(
                      (card.rank === 'A' && card.suit !== topCardSuit) ||
                      card.isJoker
                    );
                  }
                  // 기타 공격 카드는 일반 규칙 적용 (같은 무늬/숫자 또는 조커)
                  else {
                    isPlayable = Boolean(
                      card.suit === topCardSuit || 
                      card.rank === topCardRank || 
                      card.isJoker
                    );
                  }
                } else {
                  // 공격 스택이 없을 때: 일반 규칙
                  const selectedSuitUI = selectedSuit ? suitToUI(selectedSuit) : null;
                  isPlayable = Boolean(
                    card.suit === topCard.suit || 
                    card.rank === topCard.rank || 
                    card.isJoker ||
                    (selectedSuitUI && card.suit === selectedSuitUI) ||
                    topCard.suit === 'joker'
                  );
                }
              }
              
              return (
                <div
                  key={card.id || index}
                  className="relative transition-all duration-300 hover:-translate-y-6 hover:z-50"
                  style={{
                    marginLeft: index === 0 ? 0 : `-${overlapPx}px`,
                    zIndex: index
                  }}
                >
                  <PlayingCard
                    card={card}
                    isPlayable={isPlayable}
                    onClick={() => isPlayable && handlePlayCard(index)}
                    className="shadow-2xl"
                    style={{ width: '7rem' }} // 더 큰 크기로 조정
                  />
                </div>
              );
            })}
          </div>

          {/* Skill Button (Right) */}
          <div className="flex flex-col gap-2 items-end min-w-[120px] shrink-0">
            {(() => {
              const isSkillReady = isMyTurn && currentSkillCharge >= maxSkillCooldown;
              return (
                <button
                  onClick={() => {
                    if (isSkillReady) {
                      // Use Skill Logic (Mock)
                      console.log("Skill Used!");
                      setCurrentSkillCharge(0);
                    } else {
                      // Test Logic: Charge Up
                      setCurrentSkillCharge(prev => Math.min(maxSkillCooldown, prev + 1));
                    }
                  }}
                  className={`px-6 py-8 rounded-xl text-xl font-bold shadow-lg transition-all w-full whitespace-nowrap
                    ${isSkillReady
                      ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 cursor-pointer'
                      : 'bg-gray-600/50 text-gray-400 cursor-not-allowed grayscale'
                    }
                  `}
                >
                  능력 사용하기
                </button>
              );
            })()}
            <div className="bg-black/40 rounded-lg h-6 w-full overflow-hidden border border-white/30 flex">
              {/* Segmented Cooldown Bar */}
              {Array.from({ length: maxSkillCooldown }).map((_, i) => {
                const isFilled = i < currentSkillCharge;
                return (
                  <div
                    key={i}
                    className={`flex-1 ${isFilled ? 'bg-blue-500' : 'bg-transparent'} ${
                      // Add right border divider unless it's the last segment
                      i < maxSkillCooldown - 1 ? 'border-r border-white/30 border-dotted' : ''
                      }`}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* 게임 종료 통계 다이얼로그 */}
        <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
          <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">게임 종료</DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              {gameEndData && (
                <>
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2">
                      {gameEndData.myRank === 1 ? '🎉 1등!' : `${gameEndData.myRank}등`}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {gameEndData.reason === 'hand_empty' && '모든 카드를 소진했습니다'}
                      {gameEndData.reason === 'burst' && '파산했습니다'}
                      {gameEndData.reason === 'player_left' && '플레이어가 나갔습니다'}
                    </p>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-center text-gray-300 text-sm">
                      {gameEndData.winnerId === sessionId 
                        ? '축하합니다! 승리하셨습니다!' 
                        : '다음 게임에서 더 좋은 성적을 거두세요!'}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setShowStatsDialog(false);
                  // MainScreen으로 이동
                  if (onBackToMain) {
                    onBackToMain();
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                확인
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 7 카드 수트 선택 다이얼로그 */}
        <Dialog open={showSuitDialog} onOpenChange={setShowSuitDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>문양 선택</DialogTitle>
              <DialogDescription>
                7 카드를 사용했습니다. 변경할 문양을 선택하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                onClick={() => handleSuitSelect('SPADE')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
              >
                <div className="text-4xl">♠</div>
                <span className="text-sm font-semibold">스페이드</span>
              </button>
              <button
                onClick={() => handleSuitSelect('HEART')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
              >
                <div className="text-4xl text-red-600">♥</div>
                <span className="text-sm font-semibold">하트</span>
              </button>
              <button
                onClick={() => handleSuitSelect('DIAMOND')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
              >
                <div className="text-4xl text-red-600">♦</div>
                <span className="text-sm font-semibold">다이아몬드</span>
              </button>
              <button
                onClick={() => handleSuitSelect('CLUB')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-100 transition-all"
              >
                <div className="text-4xl">♣</div>
                <span className="text-sm font-semibold">클럽</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LandscapeLayout>
  );
}