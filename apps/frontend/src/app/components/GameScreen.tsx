import { useState } from 'react';
import PlayingCard from '@/app/components/PlayingCard';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { Card } from '@/app/utils/gameLogic';

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
}

// Visual component for Opponent's Hand (Stacked)
const OpponentHandVisual = ({ count, isLeft }: { count: number; isLeft: boolean }) => {
  // Cap the visual stack to avoid rendering too many DOM elements
  const VISUAL_CAP = 15;
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
      {/* Show count badge if more than visual cap */}
      {count > VISUAL_CAP && (
        <div
          className={`absolute -bottom-2 ${isLeft ? 'right-0' : 'left-0'} bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-50`}
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

export default function GameScreen({ }: GameScreenProps) {
  // Mock State
  const myId = 'me';
  const [turnPlayerId, setTurnPlayerId] = useState<string>(myId); // start with my turn

  const isMyTurn = turnPlayerId === myId;

  const [myHand, setMyHand] = useState<Card[]>([
    { id: 'c1', suit: 'spades', rank: 'A' },
    { id: 'c2', suit: 'diamonds', rank: 'K' },
    { id: 'c3', suit: 'hearts', rank: 'Q' },
    { id: 'c4', suit: 'clubs', rank: 'A' },
    { id: 'c5', suit: 'spades', rank: 'K' },
    { id: 'c6', suit: 'diamonds', rank: 'Q' },
    { id: 'c7', suit: 'hearts', rank: 'A' },
    { id: 'c8', suit: 'clubs', rank: 'K' },
    { id: 'c9', suit: 'spades', rank: 'Q' },
  ]);

  const [topCard, setTopCard] = useState<Card>({ id: 'top', suit: 'clubs', rank: 'A' });
  const [deckCount, setDeckCount] = useState(25);
  const [attackStack, setAttackStack] = useState(8);
  const [direction, setDirection] = useState<'clockwise' | 'counter-clockwise'>('clockwise');

  // Mock Skill State
  const maxSkillCooldown = 3;
  const currentSkillCharge = 1;

  // Mock Opponents
  const opponents: Player[] = [
    { id: 'op1', name: 'Nickname C', character: '캐릭터', cardCount: 6, position: 'left-top' },
    { id: 'op2', name: 'Nickname E', character: '캐릭터', cardCount: 7, position: 'left-bottom' },
    { id: 'op3', name: 'Nickname D', character: '캐릭터', cardCount: 5, position: 'right-top' },
    { id: 'op4', name: 'Nickname A', character: '캐릭터', cardCount: 8, position: 'right-bottom' },
  ];

  // Logic placeholders
  const handlePlayCard = (index: number) => {
    if (!isMyTurn) return; // Prevent playing if not my turn

    // In real app, emit socket event
    const card = myHand[index];
    setTopCard(card);
    setMyHand(prev => prev.filter((_, i) => i !== index));
    setDeckCount(prev => prev + 1); // Discard pile grows

    // Mock: Playing 'Q' toggles direction
    if (card.rank === 'Q') {
      setDirection(prev => prev === 'clockwise' ? 'counter-clockwise' : 'clockwise');
    }

    // Mock Turn Change
    setTurnPlayerId('op1');
    setTimeout(() => setTurnPlayerId(myId), 2000); // Back to me after 2s
  };

  const handleDrawCard = () => {
    if (!isMyTurn) return;

    // In real app, emit draw event
    setMyHand(prev => [...prev, { id: `draw-${Date.now()}`, suit: 'joker', rank: 'JOKER_BW', isJoker: true }]); // Dummy draw

    // Mock Turn Change (End turn after draw)
    setTurnPlayerId('op1');
    setTimeout(() => setTurnPlayerId(myId), 2000);
  };

  return (
    <LandscapeLayout>
      <div className="size-full relative p-4 sm:p-8 flex flex-col justify-between">
        {/* Header Title replaced by Turn Indicator */}
        <TurnDirectionIndicator direction={direction} />

        {/* Top Half: Opponents */}
        <div className="flex justify-between items-start w-full mt-8 sm:mt-12">
          {/* Left Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pl-4 sm:pl-12">
            {opponents.filter(p => p.position.startsWith('left')).map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={turnPlayerId === p.id} />
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pr-4 sm:pr-12">
            {opponents.filter(p => p.position.startsWith('right')).map(p => (
              <OpponentProfile key={p.id} player={p} isTurn={turnPlayerId === p.id} />
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
            />
            <div className="text-center text-white font-bold bg-black/50 rounded-full px-3 py-1">
              남은 카드: {deckCount}
            </div>
          </div>

          {/* Top Card (Discard) */}
          <div className="relative flex flex-col items-center gap-2">
            <PlayingCard card={topCard} />
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
          {/* Sort Button (Left) */}
          <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl text-xl font-bold shadow-lg transition-transform hover:scale-105 min-w-[120px]">
            정렬 꺼짐
          </button>

          {/* Hand Cards (Center) */}
          <div className="flex-1 flex justify-center items-end -space-x-8 hover:space-x-1 transition-all duration-300 pb-4">
            {myHand.map((card, index) => {
              // Simple playable logic: Match Suit or Rank or if card is Joker
              // AND it must be my turn
              const isPlayable = isMyTurn && (card.suit === topCard.suit || card.rank === topCard.rank || card.isJoker);
              return (
                <div key={index} className="relative transition-all duration-300 hover:-translate-y-6 hover:z-50">
                  <PlayingCard
                    card={card}
                    isPlayable={isPlayable}
                    onClick={() => isPlayable && handlePlayCard(index)}
                    className="shadow-2xl"
                  />
                </div>
              );
            })}
          </div>

          {/* Skill Button (Right) */}
          <div className="flex flex-col gap-2 items-end min-w-[120px]">
            <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-8 rounded-xl text-xl font-bold shadow-lg transition-transform hover:scale-105 w-full">
              능력 사용하기
            </button>
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
      </div>
    </LandscapeLayout>
  );
}