import { Room, Client } from "colyseus";
import { Card, CardSuit, CardRank, CardSchema, PlayerSchema, GameStateSchema, GAME_CONSTANTS, ErrorCode } from "@mafia/shared";

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
                    error: {
                        code: ErrorCode.NOT_YOUR_TURN,
                        type: "NOT_YOUR_TURN",
                        message: `지금은 당신의 차례가 아닙니다. (현재 턴: ${this.state.currentTurn})`,
                    },
                });
                return;
            }

            // 공격 스택이 있을 때는 공격 카드만 낼 수 있음
            if (this.state.attackStack > 0) {
                const attackValue = this.getAttackValue(card);
                const currentAttackValue = this.state.topCard ? this.getAttackValue(this.state.topCard) : 0;

                // 방어 실패 조건:
                // 1. 공격 카드가 아님 (attackValue === 0)
                // 2. 공격 카드를 냈지만, 현재 공격보다 약함 (attackValue < currentAttackValue)
                if (attackValue === 0 || attackValue < currentAttackValue) {
                    console.warn(`${client.sessionId}: 방어 실패 - 공격 스택: ${this.state.attackStack}, 제출: ${attackValue}, 필요: ${currentAttackValue}`);
                    client.send("card_play_response", {
                        success: false,
                        error: {
                            code: ErrorCode.MUST_RESPOND_TO_ATTACK,
                            type: "MUST_RESPOND_TO_ATTACK",
                            message: `방어 실패! 더 강력한 공격 카드로 받아쳐야 합니다. (현재 공격 등급: ${currentAttackValue}, 제출: ${attackValue})`,
                        },
                    });
                    return;
                }
            }

            // 카드 유효성 검사
            const topCard = this.state.topCard;
            if (topCard && topCard.id !== "") {
                // 1. 7 카드로 문양이 변경된 상태인지 확인
                let targetSuit = topCard.suit;
                if (this.state.selectedSuit && this.state.selectedSuit !== "") {
                    targetSuit = this.state.selectedSuit as CardSuit;
                    console.log(`현재 변경된 문양 적용 중: ${targetSuit}`);
                }

                // 2. 낼 수 있는 조건 검사
                const matchesSuit = card.suit === targetSuit;
                const matchesRank = card.rank === topCard.rank;
                const isJoker = card.suit === 'JOKER';
                const isTopJoker = topCard.suit === 'JOKER';

                // 주의: 문양이 변경된 상태라면, 문양이 일치하거나 조커여야 함 (랭크 일치는 허용하되, topCard가 변경된 문양을 반영하지 않으므로 주의)
                // 하지만 일반적인 원카드 룰에서는 '숫자가 같으면 낼 수 있다'가 우선시되기도 함.
                // 여기서는 안전하게 '변경된 문양과 같거나', '숫자가 같거나', '조커이거나' 로 허용
                const canPlay = matchesSuit || matchesRank || isJoker || isTopJoker;

                if (!canPlay) {
                    console.warn(`${client.sessionId}: 카드를 낼 수 없습니다. targetSuit=${targetSuit}, card=${card.suit}`);
                    client.send("card_play_response", {
                        success: false,
                        error: {
                            code: ErrorCode.INVALID_CARD_SUIT,
                            type: "INVALID_CARD_SUIT",
                            message: `낼 수 없는 카드입니다. (필요 문양: ${targetSuit}, 랭크: ${topCard.rank})`,
                        },
                    });
                    return;
                }
            }

            // 모든 검증 통과 후 카드를 핸드에서 제거
            player.hand.splice(cardIndex, 1);

            // 기존 topCard를 discardPile에 보관 (데이터 손실 방지)
            const oldTopCard = this.state.topCard;
            if (oldTopCard && oldTopCard.id !== "") {
                this.discardPile.push({
                    id: oldTopCard.id,
                    suit: oldTopCard.suit,
                    rank: oldTopCard.rank
                });
            }

            // topCard 업데이트
            const newTopCard = new CardSchema(card.id, card.suit, card.rank);
            this.state.topCard = newTopCard;

            // 7 카드 사용 시 문양 변경 처리
            if (card.rank === '7' && message.selectedSuit) {
                this.state.selectedSuit = message.selectedSuit;
                console.log(`문양이 ${message.selectedSuit}로 변경되었습니다.`);
            } else {
                // 7 카드가 아니면 문양 변경 상태 해제 (중요!)
                // 단, 조커는 문양 속성이 없으므로 selectedSuit를 유지할 수도 있으나, 보통 조커 후에는 원하는 거 낼 수 있음.
                // 여기서는 7이 아니면 무조건 초기화하여 '다음 턴 1회 한정' 처럼 동작하게 하거나,
                // 플레이어가 카드를 냈으니 그 카드의 문양으로 흐름이 이어지므로 초기화하는 것이 맞음.
                this.state.selectedSuit = "";
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
                // K 카드는 공격 스택을 초기화하지 않음 (공격 스택이 있으면 유지) -> 사실 K로 공격 방어는 불가능하므로 공격 스택이 0일 때만 의미 있음
            } else {
                // 일반 카드: 공격 스택이 없을 때만 초기화
                // 공격 스택이 있으면 이미 위에서 공격 카드만 낼 수 있도록 검증했으므로
                // 여기 도달했다는 것은 공격 스택이 0이거나(일반 상황), 공격 카드를 내서 스택이 증가한 경우(위의 if문)
                // 따라서 '일반 카드'인 경우에만 스택을 0으로 확정하면 됨.
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

                // 랭킹 계산
                const stats: any = {};
                const playerIds = Array.from(this.state.players.keys());
                const currentTurnIndex = playerIds.indexOf(this.state.currentTurn); // 종료 시점의 턴 (승자)

                // 1. 모든 플레이어 정보 수집
                const playersData = playerIds.map(id => {
                    const p = this.state.players.get(id);
                    return {
                        id,
                        handCount: p ? p.hand.length : 0,
                        isWinner: id === client.sessionId,
                        // 현재 턴(승자)으로부터의 거리 계산 (방향 고려)
                        // 턴이 가까울수록(먼저 올수록) 우선순위 높음
                        turnDistance: this.getTurnDistance(playerIds, currentTurnIndex, id)
                    };
                });

                // 2. 정렬 로직 (1순위: 카드 수 오름차순, 2순위: 턴 거리 오름차순)
                playersData.sort((a, b) => {
                    if (a.handCount !== b.handCount) {
                        return a.handCount - b.handCount;
                    }
                    return a.turnDistance - b.turnDistance;
                });

                // 3. 랭킹 부여 및 stats 생성
                playersData.forEach((p, index) => {
                    stats[p.id] = {
                        remainingCards: p.handCount,
                        rank: index + 1,
                        isWinner: p.isWinner
                    };
                });

                this.broadcast("game_end", {
                    winnerId: client.sessionId,
                    reason: 'hand_empty',
                    stats: stats
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
                    error: {
                        code: ErrorCode.NOT_YOUR_TURN,
                        type: "NOT_YOUR_TURN",
                        message: "내 턴이 아닙니다.",
                    },
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

            // 1. 현재 덱에서 최대한 뽑기
            while (drawnCards.length < cardsToDraw) {
                if (this.deck.length === 0) {
                    // 덱이 비었으면 보충 시도
                    this.replenishDeck();

                    // 보충 후에도 비었으면 더 이상 뽑을 수 없음 (게임 내 카드 부족)
                    if (this.deck.length === 0) break;
                }

                const drawnCard = this.deck.pop();
                if (drawnCard) {
                    drawnCards.push(drawnCard);
                    player.hand.push(new CardSchema(drawnCard.id, drawnCard.suit, drawnCard.rank));
                }
            }

            // 덱이 비었으면 즉시 보충 (덱이 0장으로 유지되는 것 방지)
            if (this.deck.length === 0) {
                this.replenishDeck();
            }

            // 2. 뽑은 카드가 있으면 처리
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

                // 파산 확인 (카드 뽑은 후 핸드 > 20)
                if (player.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE) {
                    this.handlePlayerElimination(client, 'burst');
                }
            } else {
                // 덱도 비고 버린 카드도 없어서 하나도 못 뽑은 경우
                client.send("draw_card_response", {
                    success: false,
                    error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                        type: "INTERNAL_SERVER_ERROR",
                        message: "더 이상 뽑을 카드가 없습니다.",
                    },
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

    // 덱 보충 (DiscardPile -> Deck)
    replenishDeck() {
        if (this.discardPile.length === 0) return;

        console.log(`덱 보충 시작: 버린 카드 ${this.discardPile.length}장을 덱으로 이동합니다.`);

        // discardPile의 카드를 deck으로 이동
        // 주의: topCard는 discardPile에 없으므로 안전함
        this.discardPile.forEach(card => {
            this.deck.push(card);
        });

        // discardPile 초기화
        this.discardPile = [];

        // 덱 셔플
        this.shuffleDeck();
        this.state.deckCount = this.deck.length;
        console.log(`덱 보충 완료: 현재 덱 ${this.deck.length}장`);
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
        if (this.state.status === "PLAYING") {
            this.handlePlayerElimination(client, 'player_left');
        } else {
            console.log(`${client.sessionId}님이 떠났습니다.`);
            this.state.players.delete(client.sessionId);
        }
    }

    // 플레이어 탈락 처리 (나가기, 파산 등)
    handlePlayerElimination(client: Client, reason: 'burst' | 'player_left') {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        console.log(`${client.sessionId}님이 탈락했습니다. 사유: ${reason}`);

        // 1. 턴 넘김 처리 (나가는 사람이 현재 턴이라면)
        if (this.state.currentTurn === client.sessionId) {
            console.log("현재 턴 플레이어 탈락, 턴을 넘깁니다.");
            this.nextTurn(false);
        }

        // 2. 랭킹 계산 (현재 인원수 = 탈락자 등수)
        const rank = this.state.players.size;
        const stats: any = {
            [client.sessionId]: {
                remainingCards: player.hand.length,
                rank: rank,
                isWinner: false
            }
        };

        // 3. 카드 반납 및 덱 셔플
        if (player.hand.length > 0) {
            player.hand.forEach(card => {
                this.deck.push({ id: card.id, suit: card.suit, rank: card.rank });
            });
            this.shuffleDeck();
            this.state.deckCount = this.deck.length;
            console.log(`탈락자 카드 ${player.hand.length}장 덱 반환 완료.`);
        }

        // 4. 탈락자에게 개별 통지 (게임 종료 메시지 형식 활용)
        client.send("game_end", {
            winnerId: "", // 승자 없음 (개별 탈락)
            reason: reason,
            stats: stats
        });

        // 5. 플레이어 제거 및 알림
        this.state.players.delete(client.sessionId);
        this.broadcast("announcement", {
            message: `${player.nickname || client.sessionId}님이 ${reason === 'burst' ? '파산' : '퇴장'}하여 탈락했습니다.`,
            type: "warning"
        });

        // 6. 남은 인원이 1명이면 게임 종료 (마지막 생존자 승리)
        if (this.state.players.size === 1) {
            const winnerId = Array.from(this.state.players.keys())[0];
            this.state.status = "ENDED";
            this.state.winnerId = winnerId;

            // 승자 stats 생성
            const winnerStats: any = {
                [winnerId]: {
                    remainingCards: this.state.players.get(winnerId)?.hand.length || 0,
                    rank: 1,
                    isWinner: true
                }
            };

            console.log(`최후의 1인 승리: ${winnerId}`);
            this.broadcast("game_end", {
                winnerId: winnerId,
                reason: 'hand_empty', // 생존 승리도 일반 승리와 동일하게 처리하거나 별도 코드로 구분 가능
                stats: winnerStats
            });
        }
    }

    // 공격 카드의 방어력/공격력 값을 반환 (2 < A < Black < Color)
    getAttackValue(card: Card): number {
        if (card.suit === 'JOKER') {
            if (card.rank === 'COLOR') return 8; // 컬러 조커 (최강)
            if (card.rank === 'BLACK') return 5; // 흑백 조커
        }
        if (card.rank === 'A') return 3;
        if (card.rank === '2') return 2;
        return 0; // 공격 카드가 아님
    }

    // 턴 거리 계산 (currentTurnIndex에서 targetId까지의 거리)
    getTurnDistance(playerIds: string[], currentIndex: number, targetId: string): number {
        const targetIndex = playerIds.indexOf(targetId);
        if (targetIndex === -1) return 999;

        const size = playerIds.length;
        if (this.state.direction === 'clockwise') {
            return (targetIndex - currentIndex + size) % size;
        } else {
            return (currentIndex - targetIndex + size) % size;
        }
    }
}

