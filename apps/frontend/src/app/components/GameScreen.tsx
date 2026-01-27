import { useState, useEffect, useMemo } from 'react';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { Card } from '@/app/utils/gameLogic';
import { useColyseusRoom } from '@/app/hooks/useColyseusRoom';
import { useToast } from '@/app/hooks/useToast';
import { useCardSorting } from '@/app/hooks/useCardSorting';
import { useLoadingDots } from '@/app/hooks/useLoadingDots';
import { DEBUG } from '@/app/config/server';
import { cardFromUI, suitToUI } from '@/app/utils/cardConverter';
import { CardPlayMessage, DrawCardMessage, CardPlayResponseMessage, DrawCardResponseMessage, CardSuit, GameEndMessage, CHARACTER_SKILLS, CharacterId } from '@mafia/shared';
import { isCardPlayable } from '@/app/utils/cardPlayabilityUtils';
import { transformPlayersToOpponents } from '@/app/utils/opponentTransformUtils';

// Game UI Components
import TurnDirectionIndicator from '@/app/components/game/TurnDirectionIndicator';
import ConnectionStatusIndicator from '@/app/components/game/ConnectionStatusIndicator';
import LoadingOverlay from '@/app/components/game/LoadingOverlay';
import LobbyUI from '@/app/components/game/LobbyUI';
import OpponentsArea from '@/app/components/game/OpponentsArea';
import CenterArea from '@/app/components/game/CenterArea';
import BottomArea from '@/app/components/game/BottomArea';
import GameEndDialog from '@/app/components/game/GameEndDialog';
import SuitSelectDialog from '@/app/components/game/SuitSelectDialog';

interface GameScreenProps {
  playerCount: number;
  selectedCharacters: string[];
  nickname: string;
  onBackToMain?: () => void;
}

export default function GameScreen({ playerCount: initialPlayerCount = 4, selectedCharacters, nickname, onBackToMain }: GameScreenProps) {
  // Colyseus 연결
  const { status, sessionId, gameState, connect, error, sendMessage, onMessage } = useColyseusRoom();
  const { showError } = useToast();
  const loadingDots = useLoadingDots(status === 'connecting');

  // 컴포넌트 마운트 시 자동 연결
  useEffect(() => {
    connect({ name: nickname || `Player-${Math.random().toString(36).substr(2, 9)}` });
  }, [nickname, connect]);

  // 연결 상태 변경 알림
  useEffect(() => {
    if (status === 'error') {
      showError('서버 연결에 실패했습니다', {
        description: error?.message || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      });
    }
  }, [status, error, showError]);

  const myId = sessionId || 'me';
  const MOCK_HAND: Card[] = useMemo(() => [
    { id: 'mock-1', suit: 'hearts', rank: 'A' },
    { id: 'mock-2', suit: 'spades', rank: 'K' },
    { id: 'mock-3', suit: 'diamonds', rank: 'Q' },
    { id: 'mock-4', suit: 'clubs', rank: 'J' },
    { id: 'mock-5', suit: 'hearts', rank: '10' },
    { id: 'mock-6', suit: 'spades', rank: '7' },
    { id: 'mock-7', suit: 'diamonds', rank: '3' },
  ], []);

  // 게임 상태
  const gameStatus = gameState?.status || 'LOBBY';
  const isLobby = gameStatus === 'LOBBY';
  const isPlaying = gameStatus === 'PLAYING';
  const isEnded = gameStatus === 'ENDED';
  void isEnded;

  // 서버 상태에서 데이터 가져오기
  const myHand = useMemo(() => {
    if (isPlaying && gameState?.myHand) {
      return gameState.myHand;
    }
    return gameState?.myHand || MOCK_HAND;
  }, [isPlaying, gameState?.myHand, MOCK_HAND]);

  const selectedSuit = gameState?.selectedSuit || null;
  
  const originalTopCard = useMemo(() => {
    if (isPlaying && gameState?.topCard) {
      return gameState.topCard;
    }
    return { id: 'top', suit: 'clubs' as const, rank: 'A' as const };
  }, [isPlaying, gameState?.topCard]);

  const topCard = useMemo(() => {
    if (selectedSuit) {
      const selectedSuitUI = suitToUI(selectedSuit);
      return {
        ...originalTopCard,
        suit: selectedSuitUI,
      };
    }
    return originalTopCard;
  }, [originalTopCard, selectedSuit]);
  
  const deckCount = gameState?.deckCount ?? 25;
  const attackStack = gameState?.attackStack ?? 0;
  const direction = gameState?.direction || 'clockwise';
  const currentTurn = gameState?.currentTurn || null;
  const isMyTurn = currentTurn === myId && isPlaying;
  const myReadyState = gameState?.myPlayer?.isReady || false;
  const winnerId = gameState?.winnerId || null;
  void winnerId;
  
  const allPlayersReady = gameState?.players 
    ? Array.from(gameState.players.values()).every(p => p.isReady)
    : false;
  const currentPlayerCount = gameState?.players?.size || 0;
  const canStartGame = isLobby && allPlayersReady && currentPlayerCount >= 2;

  // 카드 정렬
  const { sortMode, sortedHand, handleToggleSort } = useCardSorting(myHand);

  // 서버 응답 메시지 리스너
  useEffect(() => {
    if (!onMessage) return;
    
    onMessage<CardPlayResponseMessage>('card_play_response', (response) => {
      if (response.success) {
        if (DEBUG) {
          console.log('[GameScreen] 카드 내기 성공:', response);
        }
      } else {
        console.error('[GameScreen] 카드 내기 실패:', response.error);
      }
    });
    
    onMessage<DrawCardResponseMessage>('draw_card_response', (response) => {
      if (response.success) {
        if (DEBUG) {
          console.log('[GameScreen] 카드 뽑기 성공:', response);
        }
      } else {
        console.error('[GameScreen] 카드 뽑기 실패:', response.error);
      }
    });

    onMessage<GameEndMessage>('game_end', (message) => {
      console.log('[GameScreen] 게임 종료:', message);
      const currentMyId = sessionId || 'me';
      const myStats = message.stats[currentMyId];
      const myRank = myStats?.rank || 0;
      setGameEndData({
        myRank,
        winnerId: message.winnerId,
        reason: message.reason,
      });
      setShowStatsDialog(true);
    });
  }, [onMessage, sessionId]);
  
  const handleToggleReady = () => {
    if (!isLobby) return;
    const newReadyState = !myReadyState;
    sendMessage('ready', { isReady: newReadyState });
    if (DEBUG) {
      console.log('[GameScreen] 준비 상태 변경:', newReadyState);
    }
  };

  const myCharacterName = useMemo(() => {
    if (selectedCharacters.length > 0) {
      const characterId = selectedCharacters[0] as CharacterId;
      return CHARACTER_SKILLS[characterId]?.name || '캐릭터';
    }
    return '캐릭터';
  }, [selectedCharacters]);

  const opponents = useMemo(() => {
    return transformPlayersToOpponents(gameState?.players, myId, initialPlayerCount);
  }, [gameState?.players, myId, initialPlayerCount]);

  // State
  const maxSkillCooldown = 3;
  const [currentSkillCharge, setCurrentSkillCharge] = useState(1);
  const [showSuitDialog, setShowSuitDialog] = useState(false);
  const [pendingCard, setPendingCard] = useState<{ card: Card; index: number } | null>(null);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [gameEndData, setGameEndData] = useState<{ myRank: number; winnerId: string; reason: string } | null>(null);

  // 카드 내기
  const handlePlayCard = (index: number) => {
    if (!isMyTurn || !isPlaying) return;

    const card = sortedHand[index];
    if (!card) return;

    if (card.rank === '7') {
      setPendingCard({ card, index });
      setShowSuitDialog(true);
      return;
    }

    playCardWithSuit(card, undefined);
  };

  const playCardWithSuit = (card: Card, selectedSuit?: CardSuit) => {
    if (!card) return;

    const serverCard = cardFromUI(card);
    const message: CardPlayMessage = {
      cardId: card.id,
      suit: serverCard.suit,
      rank: serverCard.rank,
      selectedSuit: selectedSuit,
    };

    sendMessage('card_play', message);
    
    if (DEBUG) {
      console.log('[GameScreen] 카드 내기:', card.id, message);
    }

    setShowSuitDialog(false);
    setPendingCard(null);
  };

  const handleSuitSelect = (suit: CardSuit) => {
    if (pendingCard) {
      playCardWithSuit(pendingCard.card, suit);
    }
  };

  const handleDrawCard = () => {
    if (!isMyTurn || !isPlaying) return;
    const message: DrawCardMessage = {};
    sendMessage('draw_card', message);
    if (DEBUG) {
      console.log('[GameScreen] 카드 뽑기 요청');
    }
  };

  // 카드 playability 체크 함수
  const checkCardPlayability = (card: Card, index: number): boolean => {
    return isCardPlayable(card, topCard, attackStack, selectedSuit, isMyTurn, isPlaying);
  };

  const handleSkillClick = () => {
    const isSkillReady = isMyTurn && currentSkillCharge >= maxSkillCooldown;
    if (isSkillReady) {
      console.log("Skill Used!");
      setCurrentSkillCharge(0);
    } else {
      setCurrentSkillCharge(prev => Math.min(maxSkillCooldown, prev + 1));
    }
  };

  return (
    <LandscapeLayout>
      <LoadingOverlay isLoading={status === 'connecting'} loadingDots={loadingDots} />
      
      <div className="size-full relative p-4 sm:p-8 flex flex-col justify-between">
        <ConnectionStatusIndicator status={status} sessionId={sessionId} error={error} />
        <TurnDirectionIndicator direction={direction} />

        {isLobby && (
          <LobbyUI
            currentPlayerCount={currentPlayerCount}
            allPlayersReady={allPlayersReady}
            readyCount={Array.from(gameState?.players?.values() || []).filter(p => p.isReady).length}
            myReadyState={myReadyState}
            canStartGame={canStartGame}
            onToggleReady={handleToggleReady}
          />
        )}

        <OpponentsArea opponents={opponents} currentTurn={currentTurn} />

        <CenterArea
          deckCount={deckCount}
          topCard={topCard}
          attackStack={attackStack}
          isMyTurn={isMyTurn}
          onDrawCard={handleDrawCard}
        />

        <BottomArea
          nickname={nickname}
          characterName={myCharacterName}
          cardCount={myHand.length}
          sortedHand={sortedHand}
          sortMode={sortMode}
          onToggleSort={handleToggleSort}
          onPlayCard={handlePlayCard}
          isCardPlayable={checkCardPlayability}
          maxSkillCooldown={maxSkillCooldown}
          currentSkillCharge={currentSkillCharge}
          isMyTurn={isMyTurn}
          onSkillClick={handleSkillClick}
        />
      </div>

      <GameEndDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        gameEndData={gameEndData}
        sessionId={sessionId}
        onConfirm={() => {
          setShowStatsDialog(false);
          if (onBackToMain) {
            onBackToMain();
          }
        }}
      />

      <SuitSelectDialog
        open={showSuitDialog}
        onOpenChange={setShowSuitDialog}
        onSelect={handleSuitSelect}
      />
    </LandscapeLayout>
  );
}
