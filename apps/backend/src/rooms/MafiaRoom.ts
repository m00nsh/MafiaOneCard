import { Room, Client } from "colyseus";
import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CardSuit, CardRank } from "@mafia/shared";

// 1. 방 안에서 관리할 데이터의 청사진 (Schema)
class GameState extends Schema {
    @type("string") status: string = "LOBBY";
    @type(["string"]) players = new ArraySchema<string>();
    // 실제 게임에 쓰일 덱과 바닥 카드는 서버 메모리에서만 관리해도 충분합니다.
}

export class MafiaRoom extends Room<GameState> {
    // 서버만 알고 있어야 하는 정보 (보안을 위해 Schema 밖에서 관리)
    private deck: Card[] = [];
    private discardPile: Card[] = [];

    onCreate(options: any) {
        this.setState(new GameState());
        console.log("마피아 원카드 방 생성!");

        // 게임 준비!
        this.prepareGame();

        // 클라이언트로부터 'card_play' 메시지를 받았을 때의 반응
        this.onMessage("card_play", (client, message) => {
            console.log(`${client.sessionId}님이 카드를 냈습니다:`, message);
            // 모든 플레이어에게 누가 카드를 냈는지 방송합니다.
            this.broadcast("announcement", `${client.sessionId}님이 카드를 냈습니다!`);
        });
    }

    // 게임 초기 세팅 함수
    prepareGame() {
        this.createDeck();
        this.shuffleDeck();
        console.log(`총 ${this.deck.length}장의 카드가 준비되었습니다.`);
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

    // 새로운 플레이어가 방에 들어왔을 때
    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId}님이 게임에 참여했습니다!`);
        this.state.players.push(client.sessionId);
    }

    // 플레이어가 나갔을 때
    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId}님이 떠났습니다.`);
        const index = this.state.players.indexOf(client.sessionId);
        if (index !== -1) {
            this.state.players.splice(index, 1);
        }
    }
}