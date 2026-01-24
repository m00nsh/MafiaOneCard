import { Card, Suit } from '@/app/utils/gameLogic';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-black',
  spades: 'text-black',
  joker: 'text-purple-600',
};

export default function PlayingCard({ card, faceDown, onClick, className = '', style }: PlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className={`w-20 h-28 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg border-2 border-white/30 flex items-center justify-center shadow-lg cursor-pointer ${className}`}
        onClick={onClick}
        style={style}
      >
        <div className="text-4xl">🂠</div>
      </div>
    );
  }

  const suitColor = suitColors[card.suit];
  const suitSymbol = suitSymbols[card.suit];

  return (
    <div
      className={`w-20 h-28 bg-white rounded-lg border-2 border-gray-300 p-2 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105 transition-transform ${className}`}
      onClick={onClick}
      style={style}
    >
      <div className="flex flex-col items-start">
        <span className={`${suitColor} font-bold`}>{card.rank}</span>
        <span className={`${suitColor} text-xl`}>{suitSymbol}</span>
      </div>
      <div className="flex items-center justify-center">
        <span className={`${suitColor} text-3xl`}>{suitSymbol}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className={`${suitColor} text-xl`}>{suitSymbol}</span>
        <span className={`${suitColor} font-bold`}>{card.rank}</span>
      </div>
    </div>
  );
}
