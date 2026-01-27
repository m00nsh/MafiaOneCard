import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/app/utils/gameLogic';

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

/**
 * 카드 정렬 기능을 제공하는 커스텀 훅
 */
export function useCardSorting(myHand: Card[]) {
  const [sortMode, setSortMode] = useState<'none' | 'suit' | 'rank'>('none');
  const [sortedHand, setSortedHand] = useState<Card[]>(myHand);
  const prevHandRef = useRef<Card[]>(myHand);

  // 서버 상태가 변경되면 정렬된 핸드도 업데이트
  useEffect(() => {
    const hasChanged = 
      prevHandRef.current.length !== myHand.length ||
      prevHandRef.current.some((card, index) => 
        card.id !== myHand[index]?.id
      );

    if (hasChanged) {
      setSortedHand([...myHand]);
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
    });
  };

  return {
    sortMode,
    sortedHand,
    handleToggleSort,
  };
}
