import { PlayerSchema, CardSchema, Card, GAME_CONSTANTS } from "@mafia/shared";

export class Player {
    constructor(private schema: PlayerSchema) { }

    // 카드 추가
    addToHand(card: Card) {
        this.schema.hand.push(new CardSchema(card.id, card.suit, card.rank));
    }

    // 카드 제거
    removeFromHand(cardId: string): Card | null {
        const index = Array.from(this.schema.hand).findIndex(c => c.id === cardId);
        if (index === -1) return null;

        const removedCard = this.schema.hand[index];
        this.schema.hand.splice(index, 1);

        // CardSchema -> Card 변환하여 반환
        return {
            id: removedCard.id,
            suit: removedCard.suit,
            rank: removedCard.rank
        };
    }

    // 카드 확인
    getCard(cardId: string): Card | null {
        const card = Array.from(this.schema.hand).find(c => c.id === cardId);
        return card ? { id: card.id, suit: card.suit, rank: card.rank } : null;
    }

    // 핸드 매수
    get handCount(): number {
        return this.schema.hand.length;
    }

    // 파산 확인
    checkBurst(): boolean {
        return this.handCount > GAME_CONSTANTS.MAX_HAND_SIZE;
    }

    // 준비 상태 토글
    toggleReady() {
        this.schema.isReady = !this.schema.isReady;
    }

    get isReady(): boolean {
        return this.schema.isReady;
    }
}
