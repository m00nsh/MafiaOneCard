import { Card, CardSuit, CardRank } from "@mafia/shared";

/**
 * 백엔드/shared 타입을 프론트엔드 UI용 타입으로 변환하는 유틸리티
 * 
 * 백엔드: 'SPADE', 'HEART', 'BLACK', 'COLOR' (대문자)
 * 프론트엔드 UI: 'spades', 'hearts', 'JOKER_BW', 'JOKER_COLOR' (소문자 + 언더스코어)
 */

// UI 렌더링용 타입 (PlayingCard 컴포넌트에서 사용)
export type UISuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type UIRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER_BW' | 'JOKER_COLOR';

export interface UICard {
  id: string;
  suit: UISuit;
  rank: UIRank;
  isJoker?: boolean;
}

/**
 * 백엔드 CardSuit → UI Suit 변환
 * 'SPADE' → 'spades', 'HEART' → 'hearts', etc.
 */
export function suitToUI(suit: CardSuit): UISuit {
  const mapping: Record<CardSuit, UISuit> = {
    'SPADE': 'spades',
    'HEART': 'hearts',
    'DIAMOND': 'diamonds',
    'CLUB': 'clubs',
    'JOKER': 'joker',
  };
  return mapping[suit];
}

/**
 * 백엔드 CardRank → UI Rank 변환
 * 'BLACK' → 'JOKER_BW', 'COLOR' → 'JOKER_COLOR'
 */
export function rankToUI(rank: CardRank): UIRank {
  const mapping: Record<CardRank, UIRank> = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'BLACK': 'JOKER_BW',
    'COLOR': 'JOKER_COLOR',
  };
  return mapping[rank];
}

/**
 * 백엔드 Card → UI Card 변환
 * 서버에서 받은 카드를 UI에서 표시할 수 있는 형식으로 변환
 */
export function cardToUI(card: Card): UICard {
  return {
    id: card.id,
    suit: suitToUI(card.suit),
    rank: rankToUI(card.rank),
    isJoker: card.suit === 'JOKER',
  };
}

/**
 * UI Card → 백엔드 Card 변환
 * UI에서 서버로 메시지를 보낼 때 사용
 */
export function cardFromUI(uiCard: UICard): Card {
  const suitMapping: Record<UISuit, CardSuit> = {
    'spades': 'SPADE',
    'hearts': 'HEART',
    'diamonds': 'DIAMOND',
    'clubs': 'CLUB',
    'joker': 'JOKER',
  };

  const rankMapping: Record<UIRank, CardRank> = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'JOKER_BW': 'BLACK',
    'JOKER_COLOR': 'COLOR',
  };

  return {
    id: uiCard.id,
    suit: suitMapping[uiCard.suit],
    rank: rankMapping[uiCard.rank],
  };
}

/**
 * 백엔드 Card 배열 → UI Card 배열 변환
 */
export function cardsToUI(cards: Card[]): UICard[] {
  return cards.map(cardToUI);
}

/**
 * UI Card 배열 → 백엔드 Card 배열 변환
 */
export function cardsFromUI(uiCards: UICard[]): Card[] {
  return uiCards.map(cardFromUI);
}
