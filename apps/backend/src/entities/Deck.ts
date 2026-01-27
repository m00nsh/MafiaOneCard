import { Card, CardSuit, CardRank, CardSchema } from "@mafia/shared";

export class Deck {
    private cards: Card[] = [];
    private discardPile: Card[] = [];

    constructor() {
        this.create();
        this.shuffle();
    }

    // 1. 54장의 카드 생성 (A~K x 4무늬 + 조커 2장)
    create() {
        const suits: CardSuit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
        const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        this.cards = [];

        // 일반 카드 52장 생성
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push({ id: `${suit}-${rank}`, suit, rank });
            }
        }

        // 조커 2장 추가
        this.cards.push({ id: 'JOKER-BLACK', suit: 'JOKER', rank: 'BLACK' });
        this.cards.push({ id: 'JOKER-COLOR', suit: 'JOKER', rank: 'COLOR' });
    }

    // 2. 카드 섞기 (Fisher-Yates Shuffle)
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // 카드 뽑기
    draw(): Card | undefined {
        return this.cards.pop();
    }

    // 버린 카드 추가
    pushToDiscard(card: Card) {
        this.discardPile.push(card);
    }

    // 덱 보충 (DiscardPile -> Deck)
    replenish() {
        if (this.discardPile.length === 0) return;

        console.log(`Deck replenishing: Moving ${this.discardPile.length} cards from discard pile.`);

        // discardPile의 카드를 deck으로 이동
        this.discardPile.forEach(card => {
            this.cards.push(card);
        });

        // discardPile 초기화
        this.discardPile = [];

        // 덱 셔플
        this.shuffle();
    }

    // 현재 덱 카드 수
    get count(): number {
        return this.cards.length;
    }

    // 덱에서 특정 카드 제거 (초기 카드 설정용 등)
    removeCard(card: Card) {
        const index = this.cards.findIndex(c => c.id === card.id);
        if (index !== -1) {
            this.cards.splice(index, 1);
        }
    }
}
