import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PlayingCard from '@/app/components/PlayingCard';
import PlayerInfo from '@/app/components/PlayerInfo';
import { ArrowUpDown } from 'lucide-react';
import { Card, Player, GameState, createDeck, canPlayCard, CARD_EFFECTS } from '@/app/utils/gameLogic';
import { characters } from '@/app/components/CharacterSelectScreen';

interface GameScreenProps {
  playerCount: number;
  selectedCharacters: string[];
}

type SortMode = 'none' | 'suit-rank' | 'rank-suit';

export default function GameScreen({ playerCount, selectedCharacters }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [showSkillDialog, setShowSkillDialog] = useState(false);

  // Initialize game
  useEffect(() => {
    const deck = createDeck();
    const players: Player[] = [];

    // Create players
    for (let i = 0; i < playerCount; i++) {
      const characterId = selectedCharacters[i] || 'merchant';
      const character = characters.find(c => c.id === characterId);
      
      players.push({
        id: `player-${i}`,
        name: i === 0 ? '나' : `플레이어 ${i + 1}`,
        characterId,
        hand: deck.splice(0, 7), // Deal 7 cards
        skillCooldown: 0,
        skillUsesLeft: characterId === 'summoner' ? 1 : characterId === 'berserker' ? 2 : undefined,
      });
    }

    // Initialize discard pile with first card
    const discardPile = [deck.pop()!];

    setGameState({
      players,
      currentPlayerIndex: 0,
      deck,
      discardPile,
      direction: 1,
      attackStack: 0,
      selectedSuit: null,
    });
  }, [playerCount, selectedCharacters]);

  const handlePlayCard = (cardIndex: number) => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return;

    const currentPlayer = gameState.players[0];
    const card = currentPlayer.hand[cardIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    // Check if defending against attack
    if (gameState.attackStack > 0) {
      const cardEffect = CARD_EFFECTS[card.rank];
      if (!cardEffect || cardEffect.type !== 'attack') {
        alert('공격 카드로만 방어할 수 있습니다!');
        return;
      }
    } else {
      // Normal play - check if card is playable
      if (!canPlayCard(card, topCard, gameState.selectedSuit)) {
        alert('이 카드는 낼 수 없습니다!');
        return;
      }
    }

    // Remove card from hand and add to discard pile
    const newHand = [...currentPlayer.hand];
    newHand.splice(cardIndex, 1);

    const newPlayers = [...gameState.players];
    newPlayers[0] = { ...currentPlayer, hand: newHand };

    const newDiscardPile = [...gameState.discardPile, card];

    setGameState({
      ...gameState,
      players: newPlayers,
      discardPile: newDiscardPile,
      selectedSuit: null, // Reset suit selection
    });

    // Check win condition
    if (newHand.length === 0) {
      setTimeout(() => alert('승리했습니다!'), 100);
      return;
    }

    // Apply card effect
    setTimeout(() => applyCardEffect(card), 300);
  };

  const applyCardEffect = (card: Card) => {
    if (!gameState) return;

    const effect = CARD_EFFECTS[card.rank];
    if (!effect) {
      // No special effect, move to next player
      nextTurn();
      return;
    }

    switch (effect.type) {
      case 'attack':
        setGameState(prev => prev ? { ...prev, attackStack: prev.attackStack + effect.value! } : prev);
        nextTurn();
        break;
      case 'skip':
        // Skip next player
        let nextIndex = (gameState.currentPlayerIndex + gameState.direction + playerCount) % playerCount;
        if (nextIndex < 0) nextIndex += playerCount;
        setGameState(prev => prev ? { ...prev, currentPlayerIndex: nextIndex } : prev);
        nextTurn();
        break;
      case 'reverse':
        setGameState(prev => prev ? { ...prev, direction: prev.direction === 1 ? -1 : 1 as (1 | -1) } : prev);
        nextTurn();
        break;
      case 'changeSuit':
        // Show suit selection dialog
        const suit = prompt('문양을 선택하세요 (hearts/diamonds/clubs/spades):');
        if (suit && ['hearts', 'diamonds', 'clubs', 'spades'].includes(suit)) {
          setGameState(prev => prev ? { ...prev, selectedSuit: suit as any } : prev);
        }
        nextTurn();
        break;
      case 'plusOne':
        // Player can play another card - don't advance turn
        alert('카드를 한 장 더 낼 수 있습니다!');
        break;
      default:
        nextTurn();
    }
  };

  const nextTurn = () => {
    if (!gameState) return;
    
    const nextIndex = (gameState.currentPlayerIndex + gameState.direction + playerCount) % playerCount;
    setGameState(prev => prev ? { ...prev, currentPlayerIndex: nextIndex } : prev);
    
    // AI players take their turn after a delay
    if (nextIndex !== 0) {
      setTimeout(() => aiTurn(nextIndex), 1000);
    }
  };

  const aiTurn = (playerIndex: number) => {
    if (!gameState) return;

    const player = gameState.players[playerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    // Find playable card
    const playableCardIndex = player.hand.findIndex(card => 
      canPlayCard(card, topCard, gameState.selectedSuit)
    );

    if (playableCardIndex !== -1) {
      // Play the card
      const card = player.hand[playableCardIndex];
      const newHand = [...player.hand];
      newHand.splice(playableCardIndex, 1);

      const newPlayers = [...gameState.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      setGameState({
        ...gameState,
        players: newPlayers,
        discardPile: [...gameState.discardPile, card],
      });

      setTimeout(() => applyCardEffect(card), 500);
    } else {
      // Draw a card
      drawCard(playerIndex);
      setTimeout(() => nextTurn(), 500);
    }
  };

  const drawCard = (playerIndex: number) => {
    if (!gameState || gameState.deck.length === 0) return;

    const newDeck = [...gameState.deck];
    const drawnCard = newDeck.pop()!;

    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hand: [...newPlayers[playerIndex].hand, drawnCard],
    };

    setGameState({
      ...gameState,
      deck: newDeck,
      players: newPlayers,
    });
  };

  const handleDrawCard = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return;
    
    // If under attack, must draw attack stack amount
    if (gameState.attackStack > 0) {
      for (let i = 0; i < gameState.attackStack; i++) {
        drawCard(0);
      }
      setGameState(prev => prev ? { ...prev, attackStack: 0 } : prev);
    } else {
      drawCard(0);
    }
    
    nextTurn();
  };

  const toggleSortMode = () => {
    setSortMode(prev => {
      if (prev === 'none') return 'suit-rank';
      if (prev === 'suit-rank') return 'rank-suit';
      return 'none';
    });
  };

  const getSortedHand = (hand: Card[]): Card[] => {
    if (sortMode === 'none') return hand;

    return [...hand].sort((a, b) => {
      if (sortMode === 'suit-rank') {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return a.rank.localeCompare(b.rank);
      } else {
        if (a.rank !== b.rank) return a.rank.localeCompare(b.rank);
        return a.suit.localeCompare(b.suit);
      }
    });
  };

  const useSkill = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return;

    const player = gameState.players[0];
    
    // Check cooldown
    if (player.skillCooldown > 0) {
      alert(`스킬 쿨타임: ${player.skillCooldown}턴 남음`);
      return;
    }

    // Check uses left
    if (player.skillUsesLeft !== undefined && player.skillUsesLeft <= 0) {
      alert('스킬 사용 횟수를 모두 소진했습니다!');
      return;
    }

    // Execute skill based on character
    const character = characters.find(c => c.id === player.characterId);
    if (!character) return;

    switch (player.characterId) {
      case 'merchant':
        alert('잡상인 스킬: 카드를 선택해 다른 플레이어에게 넘기세요 (구현 예정)');
        // TODO: Implement card transfer
        break;
      case 'tank':
        alert('탱커 스킬 활성화: 다음 공격 50% 감소!');
        // Mark tank skill active - need to add this to player state
        break;
      case 'thief':
        alert('도둑 스킬: 양옆 플레이어의 카드를 가져옵니다 (구현 예정)');
        // TODO: Steal cards
        break;
      case 'prophet':
        alert('예언자 스킬: 이전 플레이어의 카드를 확인합니다 (구현 예정)');
        // TODO: Show cards
        break;
      case 'shaman':
        alert('주술사 스킬: 다른 플레이어의 스킬 강제 사용 (구현 예정)');
        // TODO: Force skill use
        break;
      case 'summoner':
        alert('소환사 스킬: 다른 플레이어의 스킬 복사 (구현 예정)');
        // TODO: Copy skill
        break;
      case 'assassin':
        alert('암살자 스킬: 대상 플레이어에게 카드 3장 부여');
        // TODO: Add 3 cards to target
        break;
      case 'berserker':
        alert('광전사 스킬: 자신이 3장 받고 5장 공격!');
        for (let i = 0; i < 3; i++) {
          drawCard(0);
        }
        setGameState(prev => prev ? { ...prev, attackStack: 5 } : prev);
        break;
    }

    // Update cooldown and uses
    const newPlayers = [...gameState.players];
    const cooldownMap: Record<string, number> = {
      merchant: 3,
      tank: 4,
      thief: 3,
      prophet: 3,
      shaman: 3,
      summoner: 0, // No cooldown, just limited uses
      assassin: 5,
      berserker: 0, // No cooldown, just limited uses
    };

    newPlayers[0] = {
      ...player,
      skillCooldown: cooldownMap[player.characterId] || 0,
      skillUsesLeft: player.skillUsesLeft !== undefined ? player.skillUsesLeft - 1 : undefined,
    };

    setGameState({
      ...gameState,
      players: newPlayers,
    });

    setShowSkillDialog(false);
  };

  // Decrease cooldowns at start of turn
  useEffect(() => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return;

    const player = gameState.players[0];
    if (player.skillCooldown > 0) {
      const newPlayers = [...gameState.players];
      newPlayers[0] = { ...player, skillCooldown: player.skillCooldown - 1 };
      setGameState(prev => prev ? { ...prev, players: newPlayers } : prev);
    }
  }, [gameState?.currentPlayerIndex]);

  if (!gameState) {
    return <div className="size-full flex items-center justify-center">게임 준비 중...</div>;
  }

  const currentPlayer = gameState.players[0];
  const otherPlayers = gameState.players.slice(1);
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  // Determine player positions
  const playerPositions: Array<'top-left' | 'top-center-left' | 'top-center-right' | 'top-right'> = 
    playerCount === 2 ? ['top-left', 'top-right', 'top-center-left', 'top-center-right'] :
    playerCount === 3 ? ['top-left', 'top-right', 'top-center-left', 'top-center-right'] :
    playerCount === 4 ? ['top-left', 'top-right', 'top-center-left', 'top-center-right'] :
    ['top-left', 'top-right', 'top-center-left', 'top-center-right'];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full bg-gradient-to-br from-green-800 via-green-700 to-green-900 relative overflow-hidden">
        {/* Other players */}
        {otherPlayers.map((player, index) => {
          const character = characters.find(c => c.id === player.characterId);
          return (
            <PlayerInfo
              key={player.id}
              playerName={player.name}
              characterName={character?.name || ''}
              cardCount={player.hand.length}
              isCurrentTurn={gameState.currentPlayerIndex === index + 1}
              position={playerPositions[index]}
            />
          );
        })}

        {/* Center area - Deck and discard pile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
          {/* Deck */}
          <div className="relative" onClick={handleDrawCard}>
            <PlayingCard card={topCard} faceDown={true} />
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full w-8 h-8 flex items-center justify-center font-medium">
              {gameState.deck.length}
            </div>
          </div>

          {/* Discard pile */}
          <div className="relative">
            <PlayingCard card={topCard} />
            {gameState.attackStack > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-medium">
                +{gameState.attackStack}
              </div>
            )}
          </div>
        </div>

        {/* Current player's hand */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {getSortedHand(currentPlayer.hand).map((card, index) => (
            <PlayingCard
              key={card.id}
              card={card}
              onClick={() => handlePlayCard(index)}
              className={canPlayCard(card, topCard, gameState.selectedSuit) ? 'ring-2 ring-yellow-400' : ''}
            />
          ))}
        </div>

        {/* Sort button - left side */}
        <button
          onClick={toggleSortMode}
          className="absolute bottom-4 left-4 bg-purple-500 hover:bg-purple-600 p-3 rounded-full transition-all"
        >
          <ArrowUpDown className="w-6 h-6 text-white" />
        </button>

        {/* Skill button */}
        <button
          onClick={() => setShowSkillDialog(!showSkillDialog)}
          disabled={currentPlayer.skillCooldown > 0 || (currentPlayer.skillUsesLeft !== undefined && currentPlayer.skillUsesLeft <= 0)}
          className="absolute bottom-4 right-4 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-500 disabled:opacity-50 p-3 rounded-full transition-all"
        >
          <span className="text-white text-xl">⚡</span>
          {currentPlayer.skillCooldown > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {currentPlayer.skillCooldown}
            </div>
          )}
          {currentPlayer.skillUsesLeft !== undefined && (
            <div className="absolute -top-2 -left-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {currentPlayer.skillUsesLeft}
            </div>
          )}
        </button>

        {/* Skill confirmation dialog */}
        {showSkillDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md">
              <h3 className="text-xl mb-4">스킬 사용</h3>
              <p className="mb-6">{characters.find(c => c.id === currentPlayer.characterId)?.description}</p>
              <div className="flex gap-4">
                <button
                  onClick={useSkill}
                  className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                >
                  사용
                </button>
                <button
                  onClick={() => setShowSkillDialog(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Turn indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-3 rounded-full">
          {gameState.currentPlayerIndex === 0 ? '내 차례' : `플레이어 ${gameState.currentPlayerIndex + 1}의 차례`}
        </div>
      </div>
    </DndProvider>
  );
}

// Re-export characters for use in GameScreen
export { characters } from '@/app/components/CharacterSelectScreen';