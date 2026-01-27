import { Card, CardSchema, GameStateSchema, ErrorCode, GAME_CONSTANTS, CardSuit } from "@mafia/shared";
import { Deck } from "../entities/Deck";
import { TurnManager } from "./TurnManager";

export class OneCardEngine {
    constructor(
        private state: GameStateSchema,
        private deck: Deck,
        private turnManager: TurnManager
    ) { }

    // 카드 플레이 처리 (검증 및 효과 적용)
    // 성공 시 true 반환, 실패 시 { success: false, error: ... } 형태
    processCardPlay(sessionId: string, cardId: string, selectedSuit?: CardSuit): { success: boolean, error?: any, isGameEnded?: boolean } {
        const player = this.state.players.get(sessionId);
        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "Player not found" }
            };
        }

        // 1. 카드 찾기
        // player.hand는 ArraySchema이므로 배열 메서드 사용 가능하지만, 인덱스를 찾기 위해 Array.from 권장
        const handArray = Array.from(player.hand);
        const cardIndex = handArray.findIndex(c => c.id === cardId);

        if (cardIndex === -1) {
            return {
                success: false,
                error: { code: ErrorCode.CARD_NOT_IN_HAND, message: "Hand does not contain this card" }
            };
        }

        const card = handArray[cardIndex];

        // 2. 공격 방어 검증
        if (this.state.attackStack > 0) {
            const attackValue = this.getAttackValue(card);
            const currentAttackValue = this.state.topCard ? this.getAttackValue(this.state.topCard) : 0;

            // 방어 불가능 조건:
            // 1. 공격 카드가 아님 (attackValue === 0)
            // 2. 공격 카드를 냈지만, 현재 공격보다 약함 (attackValue < currentAttackValue)
            if (attackValue === 0 || attackValue < currentAttackValue) {
                return {
                    success: false,
                    error: {
                        code: ErrorCode.MUST_RESPOND_TO_ATTACK,
                        message: `Must play a stronger attack card. (Current: ${currentAttackValue}, Played: ${attackValue})`
                    }
                };
            }
        }

        // 3. 낼 수 있는 카드 검증 (룰 체크)
        const topCard = this.state.topCard;
        if (topCard && topCard.id !== "") {
            let targetSuit = topCard.suit;
            // 7/Joker 등으로 문양이 변경된 경우
            if (this.state.selectedSuit && this.state.selectedSuit !== "") {
                targetSuit = this.state.selectedSuit as CardSuit;
            }

            const matchesSuit = card.suit === targetSuit;
            const matchesRank = card.rank === topCard.rank;
            const isJoker = card.suit === 'JOKER';
            const isTopJoker = topCard.suit === 'JOKER';

            // 7/Joker로 변경된 문양을 따라야 함
            // 단, 숫자(Rank)가 같으면 문양 무시하고 낼 수 있음
            // 조커는 언제든 낼 수 있음
            const canPlay = matchesSuit || matchesRank || isJoker || isTopJoker;

            if (!canPlay) {
                return {
                    success: false,
                    error: {
                        code: ErrorCode.INVALID_CARD_SUIT,
                        message: `Invalid card. Need suit: ${targetSuit} or rank: ${topCard.rank}`
                    }
                };
            }
        }

        // --- 실행 (Execution) ---

        // 4. 핸드에서 제거 및 Discard 처리
        player.hand.splice(cardIndex, 1);

        const oldTopCard = this.state.topCard;
        if (oldTopCard && oldTopCard.id !== "") {
            // 이 엔진이 사용하는 Deck 엔티티를 통해 Discard Pile로 이동
            this.deck.pushToDiscard({
                id: oldTopCard.id,
                suit: oldTopCard.suit,
                rank: oldTopCard.rank
            });
        }

        // 새 TopCard 설정
        // CardSchema를 새로 생성하여 할당
        this.state.topCard = new CardSchema(card.id, card.suit, card.rank);

        // 5. 효과 적용 (Apply Effects)
        this.applyCardEffects(card, selectedSuit);

        // 6. 승리 조건 확인
        if (player.hand.length === 0) {
            this.state.status = "ENDED";
            this.state.winnerId = sessionId;
            // Room에서 추가 처리가 필요하다면 호출 측에서 state.status를 확인하도록 함
            return { success: true, isGameEnded: true };
        }

        return { success: true, isGameEnded: false };
    }

    private applyCardEffects(card: CardSchema, selectedSuit?: CardSuit) {
        let shouldSkipTurn = false;
        let shouldKeepTurn = false;

        // 1. 7 카드 문양 변경
        if (card.rank === '7' && selectedSuit) {
            this.state.selectedSuit = selectedSuit;
        } else {
            // 7이 아니면 문양 변경 해제 (다음 턴 플레이어가 낸 카드에 의해 초기화됨)
            // 단, 조커는 예외일 수 있으나 보통 조커 후에는 자유롭게 내므로 초기화가 맞음
            this.state.selectedSuit = "";
        }

        // 2. 공격 스택 및 특수 카드 처리
        const attackVal = this.getAttackValue(card);

        if (attackVal > 0) {
            // 공격 카드를 낸 경우 스택 추가
            if (card.rank === 'A') this.state.attackStack += GAME_CONSTANTS.ATTACK_A;
            else if (card.rank === '2') this.state.attackStack += GAME_CONSTANTS.ATTACK_2;
            else if (card.suit === 'JOKER' && card.rank === 'BLACK') this.state.attackStack += GAME_CONSTANTS.ATTACK_JOKER_BLACK;
            else if (card.suit === 'JOKER' && card.rank === 'COLOR') this.state.attackStack += GAME_CONSTANTS.ATTACK_JOKER_COLOR;
        } else {
            // 일반 카드를 낸 경우 스택 초기화
            // (이미 방어 실패 검증을 통과했으므로, 여기 도달한 일반 카드는 평시 상황임)
            this.state.attackStack = 0;

            // 특수 기능 처리
            if (card.rank === 'J') shouldSkipTurn = true;
            else if (card.rank === 'Q') this.turnManager.reverseDirection();
            else if (card.rank === 'K') shouldKeepTurn = true;
        }

        // 3. 턴 넘기기
        // K(King) 카드를 낸 경우(shouldKeepTurn)에는 턴을 넘기지 않음
        if (!shouldKeepTurn) {
            // 주의: nextTurn() 호출 전에 주술사 강제 스킬 체크는 MafiaRoom에서 처리됨
            // (OneCardEngine은 Room 인스턴스에 접근할 수 없으므로)
            this.turnManager.nextTurn(shouldSkipTurn);
        }
    }

    // 공격력 계산 헬퍼
    getAttackValue(card: Card | CardSchema): number {
        if (card.suit === 'JOKER') {
            if (card.rank === 'COLOR') return 8;
            if (card.rank === 'BLACK') return 5;
        }
        if (card.rank === 'A') return 3;
        if (card.rank === '2') return 2;
        return 0;
    }
}
