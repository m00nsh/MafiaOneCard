import { Card } from '@/app/utils/gameLogic';
import { suitToUI } from '@/app/utils/cardConverter';
import { CardSuit } from '@mafia/shared';

/**
 * 카드가 낼 수 있는지 판단하는 유틸리티 함수
 */
export function isCardPlayable(
  card: Card,
  topCard: Card,
  attackStack: number,
  selectedSuit: CardSuit | null,
  isMyTurn: boolean,
  isPlaying: boolean
): boolean {
  if (!isMyTurn || !isPlaying) return false;

  if (attackStack > 0) {
    // 공격 스택이 있을 때: 공격 카드만 낼 수 있음
    const topCardRank = topCard.rank;
    const topCardSuit = topCard.suit;
    
    // 컬러 조커는 막을 수 없음
    if (topCardRank === 'JOKER_COLOR') {
      return false;
    }
    // 흑백 조커는 컬러 조커로만 막을 수 있음
    if (topCardRank === 'JOKER_BW') {
      return card.rank === 'JOKER_COLOR';
    }
    // 2 카드: 같은 무늬 A, 다른 무늬 2, 조커
    if (topCardRank === '2') {
      return Boolean(
        (card.rank === 'A' && card.suit === topCardSuit) ||
        (card.rank === '2' && card.suit !== topCardSuit) ||
        card.isJoker
      );
    }
    // A 카드: 다른 무늬 A, 조커
    if (topCardRank === 'A') {
      return Boolean(
        (card.rank === 'A' && card.suit !== topCardSuit) ||
        card.isJoker
      );
    }
    // 기타 공격 카드는 일반 규칙 적용 (같은 무늬/숫자 또는 조커)
    return Boolean(
      card.suit === topCardSuit || 
      card.rank === topCardRank || 
      card.isJoker
    );
  } else {
    // 공격 스택이 없을 때: 일반 규칙
    const selectedSuitUI = selectedSuit ? suitToUI(selectedSuit) : null;
    return Boolean(
      card.suit === topCard.suit || 
      card.rank === topCard.rank || 
      card.isJoker ||
      (selectedSuitUI && card.suit === selectedSuitUI) ||
      topCard.suit === 'joker'
    );
  }
}
