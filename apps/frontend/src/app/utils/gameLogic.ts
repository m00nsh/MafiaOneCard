// Card types and game state definitions

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER_BW' | 'JOKER_COLOR';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isJoker?: boolean;
}

export interface Player {
  id: string;
  name: string;
  characterId: string;
  hand: Card[];
  skillCooldown: number;
  skillUsesLeft?: number; // For characters with limited uses
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  direction: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  attackStack: number; // Accumulated attack cards
  selectedSuit: Suit | null; // For suit change (7 card)
}

// Card effects
export const CARD_EFFECTS = {
  'A': { type: 'attack', value: 3, description: '다음 플레이어 3장 공격' },
  '2': { type: 'attack', value: 2, description: '다음 플레이어 2장 공격' },
  '7': { type: 'changeSuit', description: '문양 변경' },
  'J': { type: 'skip', description: '다음 플레이어 스킵' },
  'Q': { type: 'reverse', description: '진행 방향 반전' },
  'K': { type: 'plusOne', description: '한 장 더 내기' },
  'JOKER_BW': { type: 'attack', value: 5, description: '다음 플레이어 5장 공격' },
  'JOKER_COLOR': { type: 'attack', value: 8, description: '다음 플레이어 8장 공격' },
} as const;

// Create a standard deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  // Add regular cards
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        id: `${suit}-${rank}-${Math.random()}`,
        suit,
        rank,
      });
    });
  });

  // Add jokers
  deck.push({
    id: `joker-bw-${Math.random()}`,
    suit: 'joker',
    rank: 'JOKER_BW',
    isJoker: true,
  });
  deck.push({
    id: `joker-color-${Math.random()}`,
    suit: 'joker',
    rank: 'JOKER_COLOR',
    isJoker: true,
  });

  return shuffle(deck);
}

// Shuffle array
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a card can be played
export function canPlayCard(card: Card, topCard: Card, selectedSuit: Suit | null): boolean {
  // Jokers can be played on anything (except when defending against attacks)
  if (card.isJoker) {
    return true;
  }

  // If suit was changed by 7, check against that suit
  const currentSuit = selectedSuit || topCard.suit;

  // Can play if suit matches or rank matches
  return card.suit === currentSuit || card.rank === topCard.rank;
}
