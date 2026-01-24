import { Card } from '@/app/utils/gameLogic';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  isPlayable?: boolean;
}

// Sprite Sheet Constants
const IMG_W = 2693;
const IMG_H = 1420;
const CARD_W = 205;
const CARD_H = 280;
const GAP_X = 2;
const GAP_Y = 4;
const START_X = 2;
const START_Y = 2;

export default function PlayingCard({ card, faceDown, onClick, className = '', style, isPlayable = true }: PlayingCardProps) {

  const getSpriteCoords = () => {
    let row = 0;
    let col = 0;

    if (faceDown) {
      // Row 4, Col 0 (Back)
      row = 4;
      col = 0;
    } else if (card.suit === 'joker') {
      // Row 4. Col 1 (Black), Col 2 (Red). Determine based on rank or default
      row = 4;
      col = card.rank === 'RED_JOKER' ? 2 : 1; // Assuming checking generic joker
    } else {
      // Suits
      switch (card.suit) {
        case 'clubs': row = 0; break;
        case 'diamonds': row = 1; break;
        case 'hearts': row = 2; break;
        case 'spades': row = 3; break;
      }

      // Ranks
      switch (card.rank) {
        case 'A': col = 0; break;
        case '2': col = 1; break; // '2' is index 1 (2nd card)
        // ... numericals map directly if we parse? safely switch
        case '3': col = 2; break;
        case '4': col = 3; break;
        case '5': col = 4; break;
        case '6': col = 5; break;
        case '7': col = 6; break;
        case '8': col = 7; break;
        case '9': col = 8; break;
        case '10': col = 9; break;
        case 'J': col = 10; break;
        case 'Q': col = 11; break;
        case 'K': col = 12; break;
        default: col = 0;
      }
    }

    const x = -(START_X + col * (CARD_W + GAP_X));
    const y = -(START_Y + row * (CARD_H + GAP_Y));

    return { x, y };
  };

  const { x, y } = getSpriteCoords();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={faceDown ? "Face down card" : `${card.rank} of ${card.suit}`}
      onClick={isPlayable ? onClick : undefined}
      onKeyDown={(e) => isPlayable && (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={`relative inline-block rounded-lg shadow-lg cursor-pointer transition-transform bg-white overflow-hidden ${isPlayable ? 'hover:scale-105 hover:-translate-y-2' : 'brightness-50 cursor-not-allowed'
        } ${className}`}
      style={{
        width: '5rem', // Default w-20 equivalent (80px)
        aspectRatio: `${CARD_W}/${CARD_H}`, // Maintain intrinsic aspect ratio
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        className="w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <image
          href="/card_deck.png"
          width={IMG_W}
          height={IMG_H}
          x={x}
          y={y}
        />
      </svg>
    </div>
  );
}
