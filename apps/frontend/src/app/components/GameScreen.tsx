import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import PlayingCard from '@/app/components/PlayingCard';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { Card, Suit } from '@/app/utils/gameLogic';

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

// Helper component for Opponent
const OpponentProfile = ({ player }: { player: Player }) => {
  const isLeft = player.position.includes('left');

  // Hand visual - just a statc card back for now, could be stacked
  const CardDeckVisual = () => (
    <div className="relative w-16 h-24 sm:w-20 sm:h-28">
      {/* Stack effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-blue-800 rounded-lg border border-white/20 transform translate-x-1 translate-y-1" />
      <div className="absolute top-0 left-0 w-full h-full bg-blue-800 rounded-lg border border-white/20 transform translate-x-0.5 translate-y-0.5" />
      {/* Main Back */}
      <PlayingCard
        card={{ suit: 'joker', rank: 'JOKER' }}
        faceDown={true}
        className="absolute top-0 left-0 shadow-lg"
      />
    </div>
  );

  return (
    <div className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Info Box */}
      <div className="bg-gray-300 rounded-lg p-4 min-w-[140px] sm:min-w-[160px] shadow-lg">
        <p className="text-gray-900 font-bold text-lg sm:text-xl truncate">{player.name}</p>
        <p className="text-gray-600 text-sm sm:text-base">{`{${player.character}}`}</p>
        <p className="text-blue-600 font-bold mt-1">카드: {player.cardCount}장</p>
      </div>

      {/* Card Deck Visual */}
      <CardDeckVisual />
    </div>
  );
};

export default function GameScreen({ playerCount, selectedCharacters }: GameScreenProps) {
  // Mock State
  const [myHand, setMyHand] = useState<Card[]>([
    { suit: 'spades', rank: 'A' },
    { suit: 'diamonds', rank: 'K' },
    { suit: 'hearts', rank: 'Q' },
    { suit: 'clubs', rank: 'A' },
    { suit: 'spades', rank: 'K' },
    { suit: 'diamonds', rank: 'Q' },
    { suit: 'hearts', rank: 'A' },
    { suit: 'clubs', rank: 'K' },
    { suit: 'spades', rank: 'Q' },
  ]);

  const [topCard, setTopCard] = useState<Card>({ suit: 'clubs', rank: 'A' });
  const [deckCount, setDeckCount] = useState(25);
  const [attackStack, setAttackStack] = useState(8);

  // Mock Opponents
  const opponents: Player[] = [
    { id: 'op1', name: 'Nickname C', character: '캐릭터', cardCount: 6, position: 'left-top' },
    { id: 'op2', name: 'Nickname E', character: '캐릭터', cardCount: 7, position: 'left-bottom' },
    { id: 'op3', name: 'Nickname D', character: '캐릭터', cardCount: 5, position: 'right-top' },
    { id: 'op4', name: 'Nickname A', character: '캐릭터', cardCount: 8, position: 'right-bottom' },
  ];

  // Logic placeholders
  const handlePlayCard = (index: number) => {
    // In real app, emit socket event
    const card = myHand[index];
    setTopCard(card);
    setMyHand(prev => prev.filter((_, i) => i !== index));
    setDeckCount(prev => prev + 1); // Discard pile grows
  };

  const handleDrawCard = () => {
    // In real app, emit draw event
    setMyHand(prev => [...prev, { suit: 'joker', rank: 'JOKER' }]); // Dummy draw
  };

  return (
    <LandscapeLayout>
      <div className="size-full relative p-4 sm:p-8 flex flex-col justify-between">
        {/* Header Title */}


        {/* Top Half: Opponents */}
        <div className="flex justify-between items-start w-full mt-8 sm:mt-4">
          {/* Left Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pl-4 sm:pl-12">
            {opponents.filter(p => p.position.startsWith('left')).map(p => (
              <OpponentProfile key={p.id} player={p} />
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8 sm:gap-12 pr-4 sm:pr-12">
            {opponents.filter(p => p.position.startsWith('right')).map(p => (
              <OpponentProfile key={p.id} player={p} />
            ))}
          </div>
        </div>

        {/* Center Area: Deck & Discard */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
          {/* Deck (Face Down) */}
          <div onClick={handleDrawCard}>
            <PlayingCard
              card={{ suit: 'joker', rank: 'JOKER' }}
              faceDown={true}
              className="hover:scale-105 transition-transform"
            />
            <div className="text-center text-white font-bold mt-2 bg-black/50 rounded-full px-2">
              {deckCount}
            </div>
          </div>

          {/* Top Card (Discard) */}
          <div className="relative">
            <PlayingCard card={topCard} />
            {attackStack > 0 && (
              <div className="absolute -top-3 -right-3 bg-red-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg z-20">
                +{attackStack}
              </div>
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
              // Simple playable logic: Match Suit or Rank
              const isPlayable = card.suit === topCard.suit || card.rank === topCard.rank || card.rank === 'JOKER';
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
            <div className="bg-black/40 rounded-full h-4 w-full overflow-hidden border border-white/30">
              {/* Skill Gauge */}
              <div className="h-full bg-blue-500 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </LandscapeLayout>
  );
}