import { GameStateSchema, PlayerSchema, CharacterId, GAME_CONSTANTS, CardSuit, ErrorCode, CharacterSkill, CardSchema, CHARACTER_SKILLS } from "@mafia/shared";
import { Deck } from "../entities/Deck";
import { TurnManager } from "./TurnManager";
import { OneCardEngine } from "./OneCardEngine";

export interface SkillResult {
    success: boolean;
    error?: any;
    isGameEnded?: boolean; // 승리
    eliminatedPlayerIds?: string[]; // 파산
    message?: string; // 클라이언트 알림 메시지
    // 예언자 스킬용: 확인한 카드 정보
    prophetCards?: Array<{ id: string; suit: string; rank: string }>; // 다음 플레이어의 카드 3장 (또는 모든 카드)
    targetPlayerId?: string; // 확인한 플레이어 ID
}

export class SkillManager {
    constructor(
        private state: GameStateSchema,
        private deck: Deck,
        private turnManager: TurnManager,
        private engine: OneCardEngine // 승리 조건 체크 등 활용 가능
    ) { }

    /**
     * 주술사 스킬: 타겟 플레이어가 지목 가능한지 검증
     * 지목 가능 조건:
     * 1. 전체 플레이 중 능력을 사용할 수 있는 횟수가 정해진 능력 (소환사, 광전사) - skillUsesLeft > 0
     * 2. 쿨타임이 전부 차 바로 사용 가능하거나, 본인의 턴에 쿨타임이 전부 차는 것이 보장되는 경우
     *    (쿨타임이 n턴이면 게이지가 n-1 이상)
     */
    private canBeShamanTarget(targetPlayer: PlayerSchema): boolean {
        const skillId = targetPlayer.characterId as CharacterId;
        if (!skillId) return false;

        const skillInfo = CHARACTER_SKILLS[skillId];
        if (!skillInfo) return false;

        // 1. 횟수 제한 스킬 (소환사, 광전사)
        if (skillInfo.cooldown === 0 && skillInfo.maxUses) {
            return targetPlayer.skillUsesLeft > 0;
        }

        // 2. 쿨타임 기반 스킬
        // 쿨타임이 n턴이면, 게이지가 n-1 이상이면 이번 턴에 +1하면 차게 됨
        const requiredProgress = skillInfo.cooldown - 1;
        return targetPlayer.skillProgress >= requiredProgress;
    }

    // 스킬 사용 메인 진입점
    useSkill(sessionId: string, skillId: CharacterId, targetId?: string, selectedCardId?: string, targetIds?: string[]): SkillResult {
        const player = this.state.players.get(sessionId);
        if (!player) return { success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "Player not found" } };

        // 1. 공통 검증 (턴, 이미 행동 여부, 쿨타임)
        const validation = this.validateSkillUse(sessionId, player, skillId);
        if (!validation.success) return validation;

        // 2. 스킬별 로직 실행
        return this.executeSkill(sessionId, player, skillId, targetId, selectedCardId, targetIds);
    }

    private validateSkillUse(sessionId: string, player: PlayerSchema, skillId: CharacterId): SkillResult {
        // 내 턴인지 확인
        if (this.state.currentTurn !== sessionId) {
            return { success: false, error: { code: ErrorCode.NOT_YOUR_TURN, message: "Not your turn" } };
        }

        // 이미 행동했는지 확인 (카드를 냈거나 뽑았으면 불가 - 이건 Room에서 hasActed 플래그를 관리해야 함.
        // 현재는 Room 구조상 카드를 내거나 뽑으면 턴이 넘어가므로, 턴이 유지되고 있다는 것 자체가 '아직 행동 안 함'을 의미할 수 있음.
        // 단, K 카드로 턴이 유지된 경우는 예외일 수 있음 -> 기획서 상 '나의 차례가 시작되는 순간' 쿨타임 감소라고 했으므로 
        // 행동하기 '전'에만 스킬 사용 가능.
        // 여기서는 별도 플래그 없이 턴 중이면 가능하다고 가정하되, 추후 상세 제어가 필요하면 Room과 연동.

        // 쿨타임 확인
        // 소환사, 광전사는 횟수 제한
        if (skillId === 'summoner' || skillId === 'berserker') {
            if (player.skillUsesLeft <= 0) {
                return { success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "No skill uses left" } };
            }
        } else {
            // 나머지는 게이지 방식 (skillProgress >= skillMaxCooldown)
            if (player.skillProgress < player.skillMaxCooldown) {
                return { success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "Skill on cooldown" } };
            }
        }

        // 캐릭터 일치 여부 확인 (보안)
        if (player.characterId !== skillId && player.characterId !== 'summoner') {
            // 소환사는 다른 스킬을 쓸 수 있으므로 예외 처리가 필요할 수 있지만, 
            // 클라이언트는 useSkill(sessionId, 'summoner', subSkillId) 형태가 아니라
            // useSkill(sessionId, 'summoner', targetPlayerId) 형태로 보냄
            // 따라서 targetId 로직에서 처리됨.
            return { success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "Character mismatch" } };
        }

        return { success: true };
    }

    private executeSkill(
        sessionId: string,
        player: PlayerSchema,
        skillId: CharacterId,
        targetId?: string,
        selectedCardId?: string,
        targetIds?: string[]
    ): SkillResult {

        // 결과 모음 (승리/파산 체크용)
        let result: SkillResult = { success: true };
        const affectedPlayers = new Set<string>(); // 변경된 플레이어 목록
        affectedPlayers.add(sessionId);

        switch (skillId) {
            case 'merchant': // 잡상인: 내 카드 1장 -> 타겟
                if (!targetId || !selectedCardId) return { success: false, error: { message: "Target and Card required" } };
                const targetM = this.state.players.get(targetId);
                const cardIndex = Array.from(player.hand).findIndex(c => c.id === selectedCardId);
                if (!targetM || cardIndex === -1) return { success: false, error: { message: "Invalid target or card" } };

                // 이동
                const [movedCard] = player.hand.splice(cardIndex, 1);
                targetM.hand.push(movedCard);
                affectedPlayers.add(targetId);
                result.message = "Card transferred.";
                break;

            case 'tank': // 탱커: 누적 데미지 -2, 남은거 드로우
                if (this.state.attackStack <= 0) return { success: false, error: { message: "No attack to block" } };

                this.state.attackStack -= 2;
                if (this.state.attackStack < 0) this.state.attackStack = 0;

                // 남은 데미지가 있으면 드로우 (공격 스택 해소)
                if (this.state.attackStack > 0) {
                    const deck = this.deck;
                    for (let i = 0; i < this.state.attackStack; i++) {
                        if (deck.count === 0) deck.replenish();
                        const card = deck.draw();
                        if (card) {
                            const cardSchema = new CardSchema(card.id, card.suit, card.rank);
                            player.hand.push(cardSchema);
                        }
                    }
                    this.state.attackStack = 0; // 데미지 받음 -> 스택 초기화
                    result.message = "Blocked 2 damage and took remainder.";
                } else {
                    result.message = "Blocked all damage.";
                }
                break;

            case 'thief': // 도둑: 이전/다음 플레이어의 패에서 카드 한 장씩 랜덤으로 뽑아 주고 받음
                // 현재 진행 방향 기준으로 이전/다음 플레이어 찾기
                const playerIds = Array.from(this.state.players.keys());
                const myIndex = playerIds.indexOf(sessionId);
                
                // 방향에 따라 이전/다음 인덱스 계산
                let prevIndex: number;
                let nextIndex: number;
                if (this.state.direction === 'clockwise') {
                    // 시계 방향: 이전 = 왼쪽, 다음 = 오른쪽
                    prevIndex = (myIndex - 1 + playerIds.length) % playerIds.length;
                    nextIndex = (myIndex + 1) % playerIds.length;
                } else {
                    // 반시계 방향: 이전 = 오른쪽, 다음 = 왼쪽
                    prevIndex = (myIndex + 1) % playerIds.length;
                    nextIndex = (myIndex - 1 + playerIds.length) % playerIds.length;
                }

                const prevId = playerIds[prevIndex];
                const nextId = playerIds[nextIndex];

                // 자신 제외 (2인 플레이 시 서로 교환)
                if (prevId === sessionId || nextId === sessionId) break; // 혼자일때

                const prevPlayer = this.state.players.get(prevId);
                const nextPlayer = this.state.players.get(nextId);

                // 이전 플레이어와 다음 플레이어가 모두 존재하고 카드를 가지고 있는 경우에만 교환
                if (prevPlayer && nextPlayer && prevPlayer.hand.length > 0 && nextPlayer.hand.length > 0) {
                    // 이전 플레이어의 카드 1장 랜덤 선택
                    const prevRandIdx = Math.floor(Math.random() * prevPlayer.hand.length);
                    const [prevCard] = prevPlayer.hand.splice(prevRandIdx, 1);
                    
                    // 다음 플레이어의 카드 1장 랜덤 선택
                    const nextRandIdx = Math.floor(Math.random() * nextPlayer.hand.length);
                    const [nextCard] = nextPlayer.hand.splice(nextRandIdx, 1);
                    
                    // 교환: 이전 플레이어의 카드를 다음 플레이어에게, 다음 플레이어의 카드를 이전 플레이어에게
                    prevPlayer.hand.push(nextCard);
                    nextPlayer.hand.push(prevCard);
                    
                    affectedPlayers.add(prevId);
                    affectedPlayers.add(nextId);
                    result.message = "Swapped cards between neighbors.";
                } else {
                    // 한 명이라도 카드가 없으면 교환 불가
                    result.message = "Cannot swap: one or both neighbors have no cards.";
                }
                break;

            case 'prophet': // 예언자: 현재 진행방향 기준, 다음 플레이어가 보유한 패 중 랜덤으로 뽑힌 카드 3장 확인
                // 현재 진행 방향 기준으로 다음 플레이어 찾기
                const prophetPlayerIds = Array.from(this.state.players.keys());
                const prophetMyIndex = prophetPlayerIds.indexOf(sessionId);
                
                if (prophetMyIndex === -1) {
                    return { success: false, error: { message: "Player not found" } };
                }
                
                // 방향에 따라 다음 플레이어 인덱스 계산
                let prophetNextIndex: number;
                if (this.state.direction === 'clockwise') {
                    // 시계 방향: 다음 = 오른쪽
                    prophetNextIndex = (prophetMyIndex + 1) % prophetPlayerIds.length;
                } else {
                    // 반시계 방향: 다음 = 왼쪽
                    prophetNextIndex = (prophetMyIndex - 1 + prophetPlayerIds.length) % prophetPlayerIds.length;
                }
                
                const prophetNextPlayerId = prophetPlayerIds[prophetNextIndex];
                const prophetNextPlayer = this.state.players.get(prophetNextPlayerId);
                
                if (!prophetNextPlayer) {
                    return { success: false, error: { message: "Next player not found" } };
                }
                
                // 다음 플레이어의 손패에서 랜덤으로 카드 선택
                const prophetHandArray = Array.from(prophetNextPlayer.hand);
                const prophetCardsToShow = Math.min(3, prophetHandArray.length); // 3장 또는 모든 카드
                
                if (prophetHandArray.length === 0) {
                    result.message = "Next player has no cards.";
                    result.targetPlayerId = prophetNextPlayerId;
                    result.prophetCards = [];
                } else {
                    // 랜덤으로 카드 선택 (Fisher-Yates shuffle 사용)
                    const prophetShuffled = [...prophetHandArray];
                    for (let i = prophetShuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [prophetShuffled[i], prophetShuffled[j]] = [prophetShuffled[j], prophetShuffled[i]];
                    }
                    
                    // 앞에서 cardsToShow개 선택
                    const prophetSelectedCards = prophetShuffled.slice(0, prophetCardsToShow).map(card => ({
                        id: card.id,
                        suit: card.suit,
                        rank: card.rank
                    }));
                    
                    result.prophetCards = prophetSelectedCards;
                    result.targetPlayerId = prophetNextPlayerId;
                    result.message = `Peeked ${prophetSelectedCards.length} card(s) from next player.`;
                }
                break;

            case 'shaman': // 주술사: 타겟 지정 (강제 스킬, 거부권 없음)
                if (!targetId) return { success: false, error: { message: "Target required" } };
                const targetS = this.state.players.get(targetId);
                if (!targetS) return { success: false, error: { message: "Invalid target" } };

                // 타겟 검증: 지목 가능한 플레이어인지 확인
                if (!this.canBeShamanTarget(targetS)) {
                    return { success: false, error: { message: "Target cannot use skill in their next turn" } };
                }

                // 타겟에게 'shaman_forced_skill' 효과 부여
                // (이 효과는 Target의 턴 시작 시 자동으로 스킬을 사용하게 함)
                targetS.activeEffects.push("shaman_forced_skill");

                result.message = "Target will be forced to use skill on their turn.";
                break;

            case 'summoner': // 소환사: 타겟 스킬 복사 사용
                // 구현 복잡도 높음: 타겟의 스킬 ID를 가져와서 executeSkill 재귀 호출?
                if (!targetId) return { success: false, error: { message: "Target required" } };
                const targetSummon = this.state.players.get(targetId);
                if (!targetSummon) return { success: false, error: { message: "Invalid target" } };

                const copiedSkill = targetSummon.characterId as CharacterId; // 가정
                if (!copiedSkill) return { success: false, error: { message: "Target has no skill" } };

                // 재귀 호출로 효과 실행
                // 주의: 소환사 본인의 횟수 차감은 이미 validate에서 체크했으나, executeSkill 내에서는 차감 로직 별도 필요
                // 여기서는 '효과'만 빌려옴.
                const subResult = this.executeSkill(sessionId, player, copiedSkill, targetId /* Some skills need target */, selectedCardId, targetIds);
                if (!subResult.success) return subResult;

                // 성공 시 '타겟'의 쿨타임 리셋 (소환사 룰: 선택된 플레이어는 스킬 사용한걸로 간주)
                targetSummon.skillProgress = 0;
                targetSummon.skillUsesLeft -= 1; // 횟수제라면 차감 (0 이하는 무시)

                result = subResult;
                result.message = `Copied ${copiedSkill} from ${targetSummon.nickname}`;
                break;

            case 'assassin': // 암살자: 타겟에게 3장 부여
                if (!targetId) return { success: false, error: { message: "Target required" } };
                const targetA = this.state.players.get(targetId);
                if (!targetA) return { success: false, error: { message: "Invalid target" } };

                for (let i = 0; i < 3; i++) {
                    if (this.deck.count === 0) this.deck.replenish();
                    const c = this.deck.draw();
                    if (c) {
                        const cardSchema = new CardSchema(c.id, c.suit, c.rank);
                        targetA.hand.push(cardSchema);
                    }
                }
                affectedPlayers.add(targetId);
                result.message = "Assassinated target with 3 cards.";
                break;

            case 'berserker': // 광전사: 나 1장, 타겟들 3장
                // 1. 타겟 검증 (2명 필, 단 남은 적이 1명이면 1명 가능)
                const opponentCount = this.state.players.size - 1; // 나 제외
                const finalTargets = targetIds ? targetIds : (targetId ? [targetId] : []);

                // 중복 제거 (Set)
                const uniqueTargets = new Set(finalTargets);

                if (opponentCount >= 2) {
                    if (uniqueTargets.size < 2) return { success: false, error: { message: "Must select 2 targets" } };
                } else if (opponentCount === 1) {
                    if (uniqueTargets.size < 1) return { success: false, error: { message: "Must select 1 target" } };
                }

                // 2. Self Draw 1
                if (this.deck.count === 0) this.deck.replenish();
                const c = this.deck.draw();
                if (c) {
                    const cardSchema = new CardSchema(c.id, c.suit, c.rank);
                    player.hand.push(cardSchema);
                }

                // 3. Targets Draw 3 each
                if (uniqueTargets.size > 0) {
                    uniqueTargets.forEach(tid => {
                        const t = this.state.players.get(tid);
                        if (t && tid !== sessionId) { // 본인 제외 안전장치
                            for (let i = 0; i < 3; i++) {
                                if (this.deck.count === 0) this.deck.replenish();
                                const c2 = this.deck.draw();
                                if (c2) {
                                    const cardSchema = new CardSchema(c2.id, c2.suit, c2.rank);
                                    t.hand.push(cardSchema);
                                }
                            }
                            affectedPlayers.add(tid);
                        }
                    });
                    result.message = `Berserker rage on ${uniqueTargets.size} targets!`;
                }

                affectedPlayers.add(sessionId);
                break;
        }

        // 3. 비용 지불 (쿨타임 리셋 / 횟수 차감)
        if (skillId === 'summoner' || skillId === 'berserker') {
            player.skillUsesLeft--;
        } else {
            player.skillProgress = 0; // 게이지 초기화
        }

        // 3-1. 주술사 강제 스킬 효과 해제 (스킬 사용 완료)
        const forcedIdx = player.activeEffects.indexOf("shaman_forced_skill");
        if (forcedIdx !== -1) {
            player.activeEffects.splice(forcedIdx, 1);
        }

        // 4. 즉시 승리/파산 검증 (CRITICAL)
        const checkResult = this.checkImmediateWinOrBurst(affectedPlayers);
        if (checkResult.isGameEnded || (checkResult.eliminatedPlayerIds && checkResult.eliminatedPlayerIds.length > 0)) {
            return { ...result, isGameEnded: checkResult.isGameEnded, eliminatedPlayerIds: checkResult.eliminatedPlayerIds };
        }

        return result;
    }

    private checkImmediateWinOrBurst(playerIds: Set<string>): { isGameEnded: boolean, eliminatedPlayerIds: string[] } {
        const eliminated: string[] = [];
        let gameEnded = false;

        for (const pid of playerIds) {
            const p = this.state.players.get(pid);
            if (!p) continue;

            const handCount = p.hand.length;

            // 승리 조건 (0장)
            if (handCount === 0) {
                this.state.winnerId = pid;
                this.state.status = "ENDED";
                gameEnded = true;
                break; // 승자 발생 시 즉시 종료
            }

            // 파산 조건 (>20장)
            if (handCount > GAME_CONSTANTS.MAX_HAND_SIZE) {
                eliminated.push(pid);
            }
        }

        return { isGameEnded: gameEnded, eliminatedPlayerIds: eliminated };
    }

    // 턴 시작 시 호출 (쿨타임 관리)
    onTurnStart(playerId: string) {
        const player = this.state.players.get(playerId);
        if (!player) return;

        // 쿨타임 충전 (기본 +1)
        // 단, 'activeEffects'에 'stunned' 등이 있다면 충전 안됨? (기획서엔 점프/킹만 언급)
        // 점프는 TurnManager에서 아예 이 함수를 호출 안하거나(Skip), 호출해도 '스킵된 턴'임을 알아야 함.
        // TurnManager.nextTurn에서 skipNext=true면 그 플레이어는 건너뛰므로 onTurnStart가 호출 안 되어야 맞음.
        // 킹(K)은 TurnManager.nextTurn을 호출 안 하므로 onTurnStart도 호출 안 됨 -> 정확함.
        // 따라서 여기서는 무조건 +1 하면 됨. (최대치까지만)

        if (player.skillProgress < player.skillMaxCooldown) {
            player.skillProgress += 1;
        }

        // 주술사 강제 스킬 체크 ('shaman_forced_skill')
        // 만약 강제 스킬 효과가 있다면, 이번 턴에 자동으로 스킬을 사용함 (거부권 없음)
        if (player.activeEffects.includes("shaman_forced_skill")) {
            this.forceSkillUse(playerId, player);
        }
    }

    /**
     * 주술사에 의해 강제된 스킬 사용 처리
     * 타겟 플레이어의 턴이 시작되면 자동으로 스킬을 사용함
     */
    private forceSkillUse(playerId: string, player: PlayerSchema): void {
        const skillId = player.characterId as CharacterId;
        if (!skillId) {
            // 캐릭터가 없으면 효과 제거
            const idx = player.activeEffects.indexOf("shaman_forced_skill");
            if (idx !== -1) player.activeEffects.splice(idx, 1);
            return;
        }

        // 스킬 사용 가능 여부 재확인 (턴 시작 시 쿨타임이 충전되었을 수 있음)
        const skillInfo = CHARACTER_SKILLS[skillId];
        if (!skillInfo) {
            const idx = player.activeEffects.indexOf("shaman_forced_skill");
            if (idx !== -1) player.activeEffects.splice(idx, 1);
            return;
        }

        // 횟수 제한 스킬 체크
        if (skillInfo.cooldown === 0 && skillInfo.maxUses) {
            if (player.skillUsesLeft <= 0) {
                // 사용 횟수가 없으면 효과 제거 (이론적으로는 발생하지 않아야 함)
                const idx = player.activeEffects.indexOf("shaman_forced_skill");
                if (idx !== -1) player.activeEffects.splice(idx, 1);
                return;
            }
        } else {
            // 쿨타임 기반 스킬 체크 (이제 쿨타임이 차야 함)
            if (player.skillProgress < player.skillMaxCooldown) {
                // 아직 쿨타임이 안 찼으면 효과 제거 (이론적으로는 발생하지 않아야 함)
                const idx = player.activeEffects.indexOf("shaman_forced_skill");
                if (idx !== -1) player.activeEffects.splice(idx, 1);
                return;
            }
        }

        // 자동으로 스킬 사용 (타겟이 필요한 스킬은 랜덤 선택)
        // 주의: 이 함수는 MafiaRoom에서 호출되어야 하므로, 여기서는 직접 스킬을 실행하지 않고
        // 플래그만 설정하고 MafiaRoom에서 처리하도록 함
        // 또는 여기서 직접 executeSkill을 호출할 수도 있지만, 메시지 브로드캐스트 등을 고려해야 함
        // 일단은 MafiaRoom에서 처리하도록 플래그만 남겨둠
    }
}
