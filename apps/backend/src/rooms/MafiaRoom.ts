import { Room, Client } from "colyseus";
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { Card, CardSuit, CardRank } from "@mafia/shared";

// 0. Card Schema (Card 인터페이스 구현)
export class CardSchema extends Schema implements Card {
    @type("string") id: string;
    @type("string") suit: CardSuit;
    @type("string") rank: CardRank;

    constructor(id: string, suit: CardSuit, rank: CardRank) {
        super();
        this.id = id;
        this.suit = suit;
        this.rank = rank;
    }
}

// 1. Player Schema (핸드 관리)
export class Player extends Schema {
    @type([CardSchema]) hand = new ArraySchema<CardSchema>();
    @type("boolean") isReady: boolean = false;
}

// 2. GameState Schema
export class GameState extends Schema {
    @type("string") status: string = "LOBBY";
    @type({ map: Player }) players = new MapSchema<Player>();
    // 실제 게임에 쓰일 덱과 바닥 카드는 서버 메모리에서만 관리해도 충분합니다.
}

export class MafiaRoom extends Room<GameState> {
    // 서버만 알고 있어야 하는 정보 (보안을 위해 Schema 밖에서 관리)
    private deck: Card[] = [];
    private discardPile: Card[] = [];

    onCreate(options: any) {
        this.setState(new GameState());
        console.log("마피아 원카드 방 생성!");

        // 클라이언트로부터 'card_play' 메시지를 받았을 때의 반응
        this.onMessage("card_play", (client, message) => {
            console.log(`${client.sessionId}님이 카드를 냈습니다:`, message);
            // 모든 플레이어에게 누가 카드를 냈는지 방송합니다.
            this.broadcast("announcement", `${client.sessionId}님이 카드를 냈습니다!`);
        });

        // 'ready' 메시지 처리
        this.onMessage("ready", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isReady = !player.isReady; // 토글 혹은 true로 설정
                console.log(`${client.sessionId} is ready: ${player.isReady}`);

                // 모든 플레이어가 준비되었는지 확인
                this.checkStartGame();
            }
        });
    }

    checkStartGame() {
        // 이미 게임 중이면 무시
        if (this.state.status === "PLAYING") return;

        // 최소 2명 이상이어야 함
        if (this.state.players.size < 2) return;

        // 모든 플레이어가 준비 상태인지 확인
        let allReady = true;
        this.state.players.forEach((player) => {
            if (!player.isReady) allReady = false;
        });

        if (allReady) {
            this.state.status = "PLAYING";
            this.prepareGame();
        }
    }

    // 게임 초기 세팅 함수
    prepareGame() {
        this.createDeck();
        this.shuffleDeck();
        console.log(`총 ${this.deck.length}장의 카드가 준비되었습니다.`);

        this.distributeCards();

        // 덱에서 한 장을 꺼내 discardPile에 놓기
        const initialCard = this.deck.pop();
        if (initialCard) {
            this.discardPile.push(initialCard);
            console.log(`게임 시작! 초기 카드: ${initialCard.id}`);
        }
    }

    // 1. 54장의 카드 생성 (A~K x 4무늬 + 조커 2장)
    createDeck() {
        const suits: CardSuit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
        const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        this.deck = [];

        // 일반 카드 52장 생성
        for (const suit of suits) {
            for (const rank of ranks) {
                this.deck.push({ id: `${suit}-${rank}`, suit, rank });
            }
        }

        // 조커 2장 추가 (기획서 반영)
        this.deck.push({ id: 'JOKER-BLACK', suit: 'JOKER', rank: 'BLACK' });
        this.deck.push({ id: 'JOKER-COLOR', suit: 'JOKER', rank: 'COLOR' });
    }

    // 2. 카드 섞기 (Fisher-Yates Shuffle 알고리즘)
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // 3. 카드 분배 (7장씩)
    distributeCards() {
        this.state.players.forEach((player, sessionId) => {
            const cardsToDeal = 7;
            for (let i = 0; i < cardsToDeal; i++) {
                const card = this.deck.pop();
                if (card) {
                    // Card 객체를 CardSchema로 변환하여 할당
                    player.hand.push(new CardSchema(card.id, card.suit, card.rank));
                }
            }
            console.log(`${sessionId}님에게 ${player.hand.length}장의 카드를 분배했습니다.`);
        });
    }

    // 새로운 플레이어가 방에 들어왔을 때
    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId}님이 게임에 참여했습니다!`);
        this.state.players.set(client.sessionId, new Player());
    }

    // 플레이어가 나갔을 때
    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId}님이 떠났습니다.`);
        this.state.players.delete(client.sessionId);
    }
}

