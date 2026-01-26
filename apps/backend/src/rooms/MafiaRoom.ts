import { Room, Client } from "colyseus";
import { Card, CardSuit, CardRank, CardSchema, PlayerSchema, GameStateSchema, GAME_CONSTANTS } from "@mafia/shared";

export class MafiaRoom extends Room<GameStateSchema> {
    // 서버만 알고 있어야 하는 정보 (보안을 위해 Schema 밖에서 관리)
    private deck: Card[] = [];
    private discardPile: Card[] = [];

    onCreate(options: any) {
        this.setState(new GameStateSchema());
        // 초기 상태 설정
        this.state.status = "LOBBY";
        this.state.direction = "clockwise";
        this.state.attackStack = 0;
        this.state.deckCount = 0;
        // topCard는 빈 카드로 초기화 (게임 시작 전에는 사용되지 않음)
        this.state.topCard = new CardSchema("", "SPADE", "A");
        console.log("마피아 원카드 방 생성!");

        // 클라이언트로부터 'card_play' 메시지를 받았을 때의 반응
        this.onMessage("card_play", (client, message: { cardId: string; suit: CardSuit; rank: CardRank; selectedSuit?: CardSuit }) => {
            if (this.state.status !== "PLAYING") {
                console.warn(`${client.sessionId}: 게임이 시작되지 않았습니다.`);
                return;
            }

            const player = this.state.players.get(client.sessionId);
            if (!player) {
                console.warn(`${client.sessionId}: 플레이어를 찾을 수 없습니다.`);
                return;
            }

            // 플레이어의 핸드에서 카드 찾기
            const cardIndex = Array.from(player.hand).findIndex(card => card.id === message.cardId);
            if (cardIndex === -1) {
                console.warn(`${client.sessionId}: 카드를 찾을 수 없습니다: ${message.cardId}`);
                return;
            }

            const card = player.hand[cardIndex];
            
            // 턴 검증: 내 턴인지 확인
            if (this.state.currentTurn !== client.sessionId) {
                console.warn(`${client.sessionId}: 내 턴이 아닙니다. 현재 턴: ${this.state.currentTurn}`);
                client.send("card_play_response", {
                    success: false,
                    error: "내 턴이 아닙니다.",
                });
                return;
            }

            // 공격 스택이 있을 때는 공격 카드만 낼 수 있음 (카드 제거 전에 검증)
            if (this.state.attackStack > 0) {
                const isAttackCard = 
                    card.rank === 'A' ||
                    card.rank === '2' ||
                    (card.suit === 'JOKER' && card.rank === 'BLACK') ||
                    (card.suit === 'JOKER' && card.rank === 'COLOR');
                
                if (!isAttackCard) {
                    console.warn(`${client.sessionId}: 공격 스택이 있을 때는 공격 카드만 낼 수 있습니다.`);
                    client.send("card_play_response", {
                        success: false,
                        error: `공격 스택이 쌓여있습니다. 공격 카드(A, 2, 조커)만 낼 수 있습니다. (현재 스택: ${this.state.attackStack})`,
                    });
                    return;
                }
            }

            // 카드 유효성 검사 (간단한 버전 - 향후 개선 필요)
            const topCard = this.state.topCard;
            if (topCard && topCard.id !== "") {
                const canPlay = 
                    card.suit === topCard.suit ||
                    card.rank === topCard.rank ||
                    card.suit === 'JOKER' ||
                    topCard.suit === 'JOKER' ||
                    (this.state.selectedSuit && card.suit === this.state.selectedSuit); // 7카드 문양 변경 반영
                
                if (!canPlay) {
                    console.warn(`${client.sessionId}: 카드를 낼 수 없습니다.`);
                    // 실패 응답 전송
                    client.send("card_play_response", {
                        success: false,
                        error: "카드를 낼 수 없습니다. 문양이나 숫자가 일치하지 않습니다.",
                    });
                    return;
                }
            }

            // 모든 검증 통과 후 카드를 핸드에서 제거
            player.hand.splice(cardIndex, 1);

            // topCard 업데이트
            const newTopCard = new CardSchema(card.id, card.suit, card.rank);
            this.state.topCard = newTopCard;

            // 7 카드 사용 시 문양 변경
            if (message.selectedSuit && card.rank === '7') {
                this.state.selectedSuit = message.selectedSuit;
            }

            // 카드 효과 처리
            let shouldSkipTurn = false; // J 카드: 다음 플레이어 스킵
            let shouldReverse = false; // Q 카드: 방향 전환
            let shouldKeepTurn = false; // K 카드: 한 장 더 내기 (턴 유지)
            
            // 공격 카드 처리
            if (card.rank === 'A') {
                this.state.attackStack += GAME_CONSTANTS.ATTACK_A;
            } else if (card.rank === '2') {
                this.state.attackStack += GAME_CONSTANTS.ATTACK_2;
            } else if (card.suit === 'JOKER' && card.rank === 'BLACK') {
                this.state.attackStack += GAME_CONSTANTS.ATTACK_JOKER_BLACK;
            } else if (card.suit === 'JOKER' && card.rank === 'COLOR') {
                this.state.attackStack += GAME_CONSTANTS.ATTACK_JOKER_COLOR;
            } else if (card.rank === 'J') {
                shouldSkipTurn = true;
            } else if (card.rank === 'Q') {
                shouldReverse = true;
            } else if (card.rank === 'K') {
                shouldKeepTurn = true; // K 카드: 턴 유지 (한 장 더 내기)
                // K 카드는 공격 스택을 초기화하지 않음 (공격 스택이 있으면 유지)
            } else {
                // 일반 카드: 공격 스택이 없을 때만 초기화
                // 공격 스택이 있으면 이미 위에서 공격 카드만 낼 수 있도록 검증했으므로
                // 여기 도달했다는 것은 공격 스택이 0이라는 의미
                this.state.attackStack = 0;
            }

            // 방향 전환 (Q 카드)
            if (shouldReverse) {
                this.state.direction = this.state.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise';
                console.log(`방향 전환: ${this.state.direction}`);
            }

            // 덱 카드 수 업데이트
            this.state.deckCount = this.deck.length;

            console.log(`${client.sessionId}님이 카드를 냈습니다:`, card.id);
            
            // 게임 종료 확인 (핸드가 비어있으면 승리)
            if (player.hand.length === 0) {
                this.state.status = "ENDED";
                this.state.winnerId = client.sessionId;
                console.log(`게임 종료! 승자: ${client.sessionId}`);
                this.broadcast("game_end", {
                    winnerId: client.sessionId,
                    reason: 'hand_empty',
                });
            }
            
            // 턴 전환 (K 카드는 턴 유지)
            if (!shouldKeepTurn) {
                this.nextTurn(shouldSkipTurn);
            } else {
                console.log(`${client.sessionId}: K 카드로 인해 턴 유지 (한 장 더 내기)`);
            }
            
            // 성공 응답 전송
            client.send("card_play_response", {
                success: true,
                newTopCard: { id: card.id, suit: card.suit, rank: card.rank },
                attackStack: this.state.attackStack,
            });
            
            // 모든 플레이어에게 알림 방송
            this.broadcast("announcement", `${client.sessionId}님이 카드를 냈습니다!`);
        });

        // 클라이언트로부터 'draw_card' 메시지를 받았을 때의 반응
        this.onMessage("draw_card", (client, message) => {
            if (this.state.status !== "PLAYING") {
                console.warn(`${client.sessionId}: 게임이 시작되지 않았습니다.`);
                return;
            }

            // 턴 검증: 내 턴인지 확인
            if (this.state.currentTurn !== client.sessionId) {
                console.warn(`${client.sessionId}: 내 턴이 아닙니다.`);
                client.send("draw_card_response", {
                    success: false,
                    error: "내 턴이 아닙니다.",
                });
                return;
            }

            const player = this.state.players.get(client.sessionId);
            if (!player) {
                console.warn(`${client.sessionId}: 플레이어를 찾을 수 없습니다.`);
                return;
            }

            // 공격 스택이 있으면 공격 스택만큼 카드 뽑기
            const cardsToDraw = this.state.attackStack > 0 ? this.state.attackStack : 1;
            const drawnCards: Card[] = [];

            for (let i = 0; i < cardsToDraw; i++) {
                if (this.deck.length === 0) {
                    console.warn(`${client.sessionId}: 덱에 카드가 없습니다.`);
                    break;
                }

                const drawnCard = this.deck.pop();
                if (drawnCard) {
                    drawnCards.push(drawnCard);
                    // 플레이어 핸드에 추가
                    player.hand.push(new CardSchema(drawnCard.id, drawnCard.suit, drawnCard.rank));
                }
            }

            if (drawnCards.length > 0) {
                // 공격 스택 초기화 (카드를 뽑았으므로)
                if (this.state.attackStack > 0) {
                    this.state.attackStack = 0;
                }

                // 덱 카드 수 업데이트
                this.state.deckCount = this.deck.length;
                console.log(`${client.sessionId}님이 ${drawnCards.length}장의 카드를 뽑았습니다.`);
                
                // 턴 전환 (카드를 뽑았으므로 다음 플레이어로)
                this.nextTurn(false);
                
                // 성공 응답 전송
                client.send("draw_card_response", {
                    success: true,
                    drawnCard: { id: drawnCards[0].id, suit: drawnCards[0].suit, rank: drawnCards[0].rank },
                });
            } else {
                // 덱이 비어있을 때 실패 응답
                client.send("draw_card_response", {
                    success: false,
                    error: "덱에 카드가 없습니다.",
                });
            }
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

        // 덱 카드 수 업데이트
        this.state.deckCount = this.deck.length;

        this.distributeCards();

        // 덱에서 한 장을 꺼내 discardPile에 놓기
        const initialCard = this.deck.pop();
        if (initialCard) {
            this.discardPile.push(initialCard);
            // topCard를 GameState에 설정
            const topCardSchema = new CardSchema(initialCard.id, initialCard.suit, initialCard.rank);
            this.state.topCard = topCardSchema;
            this.state.deckCount = this.deck.length;
            console.log(`게임 시작! 초기 카드: ${initialCard.id}`);
        }

        // 첫 번째 플레이어를 currentTurn으로 설정
        const firstPlayerId = Array.from(this.state.players.keys())[0];
        if (firstPlayerId) {
            this.state.currentTurn = firstPlayerId;
            console.log(`첫 번째 턴: ${firstPlayerId}`);
        }
    }

    // 다음 턴으로 전환
    nextTurn(skipNext: boolean = false) {
        const playerIds = Array.from(this.state.players.keys());
        if (playerIds.length === 0) return;

        const currentIndex = playerIds.indexOf(this.state.currentTurn);
        if (currentIndex === -1) return;

        let nextIndex: number;
        if (this.state.direction === 'clockwise') {
            nextIndex = (currentIndex + 1) % playerIds.length;
        } else {
            nextIndex = (currentIndex - 1 + playerIds.length) % playerIds.length;
        }

        // J 카드로 인한 스킵 처리
        if (skipNext) {
            if (this.state.direction === 'clockwise') {
                nextIndex = (nextIndex + 1) % playerIds.length;
            } else {
                nextIndex = (nextIndex - 1 + playerIds.length) % playerIds.length;
            }
        }

        this.state.currentTurn = playerIds[nextIndex];
        console.log(`턴 전환: ${this.state.currentTurn} (방향: ${this.state.direction})`);
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
            const cardsToDeal = GAME_CONSTANTS.INITIAL_HAND_SIZE;
            for (let i = 0; i < cardsToDeal; i++) {
                const card = this.deck.pop();
                if (card) {
                    // Card 객체를 CardSchema로 변환하여 할당
                    player.hand.push(new CardSchema(card.id, card.suit, card.rank));
                }
            }
            // 덱 카드 수 업데이트
            this.state.deckCount = this.deck.length;
            console.log(`${sessionId}님에게 ${player.hand.length}장의 카드를 분배했습니다.`);
        });
    }

    // 새로운 플레이어가 방에 들어왔을 때
    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId}님이 게임에 참여했습니다!`);
        const player = new PlayerSchema();
        // options에서 nickname 가져오기 (있으면)
        if (options?.name) {
            player.nickname = options.name;
        }
        // 첫 번째 플레이어는 호스트
        if (this.state.players.size === 0) {
            player.isHost = true;
        }
        this.state.players.set(client.sessionId, player);
    }

    // 플레이어가 나갔을 때
    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId}님이 떠났습니다.`);
        this.state.players.delete(client.sessionId);
    }
}