// Card types and game state definitions
// Note: 백엔드와의 통신을 위해 @mafia/shared 타입을 사용하고,
// UI 렌더링을 위해 cardConverter의 변환 함수를 사용합니다.

import { 
  Card as ServerCard, 
  CardSuit, 
  CardRank, 
  CARD_EFFECTS as SERVER_CARD_EFFECTS,
  CardEffect,
  GAME_CONSTANTS 
} from "@mafia/shared";
import { UICard, UISuit, UIRank, cardToUI, cardFromUI, rankToUI } from "./cardConverter";

// UI용 타입 (기존 코드 호환성을 위해 유지)
export type Suit = UISuit;
export type Rank = UIRank;

// UI용 Card 타입 (기존 코드 호환성)
export type Card = UICard;

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

// Card effects (UI Rank 형식으로 변환)
// Note: shared의 CARD_EFFECTS는 CardRank('BLACK', 'COLOR')를 사용하므로
// UI Rank('JOKER_BW', 'JOKER_COLOR')로 변환하여 사용
export const CARD_EFFECTS: Partial<Record<UIRank, CardEffect>> = {
  'A': SERVER_CARD_EFFECTS['A'],
  '2': SERVER_CARD_EFFECTS['2'],
  '3': SERVER_CARD_EFFECTS['3'],
  '4': SERVER_CARD_EFFECTS['4'],
  '5': SERVER_CARD_EFFECTS['5'],
  '6': SERVER_CARD_EFFECTS['6'],
  '7': SERVER_CARD_EFFECTS['7'],
  '8': SERVER_CARD_EFFECTS['8'],
  '9': SERVER_CARD_EFFECTS['9'],
  '10': SERVER_CARD_EFFECTS['10'],
  'J': SERVER_CARD_EFFECTS['J'],
  'Q': SERVER_CARD_EFFECTS['Q'],
  'K': SERVER_CARD_EFFECTS['K'],
  'JOKER_BW': SERVER_CARD_EFFECTS['BLACK'],
  'JOKER_COLOR': SERVER_CARD_EFFECTS['COLOR'],
};

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
// Note: 이 함수는 UI Card 타입을 사용합니다.
// 서버로 전송하기 전에 cardFromUI()로 변환해야 합니다.
export function canPlayCard(card: Card, topCard: Card, selectedSuit: Suit | null): boolean {
  // Jokers can be played on anything (except when defending against attacks)
  if (card.isJoker || card.suit === 'joker') {
    return true;
  }

  // If suit was changed by 7, check against that suit
  const currentSuit = selectedSuit || topCard.suit;

  // Can play if suit matches or rank matches
  return card.suit === currentSuit || card.rank === topCard.rank;
}

// 서버 Card 타입을 사용하는 버전 (백엔드와 통신 시 사용)
export function canPlayCardServer(card: ServerCard, topCard: ServerCard, selectedSuit: CardSuit | null): boolean {
  // Jokers can be played on anything
  if (card.suit === 'JOKER') {
    return true;
  }

  // If suit was changed by 7, check against that suit
  const currentSuit = selectedSuit || topCard.suit;

  // Can play if suit matches or rank matches
  return card.suit === currentSuit || card.rank === topCard.rank;
}

// 변환 함수 재export (편의를 위해)
export { cardToUI, cardFromUI, cardsToUI, cardsFromUI } from "./cardConverter";
