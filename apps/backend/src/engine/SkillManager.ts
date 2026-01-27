import { GameStateSchema, PlayerSchema, CharacterId, GAME_CONSTANTS, CardSuit, ErrorCode, CharacterSkill } from "@mafia/shared";
import { Deck } from "../entities/Deck";
import { TurnManager } from "./TurnManager";
import { OneCardEngine } from "./OneCardEngine";

export interface SkillResult {
    success: boolean;
    error?: any;
    isGameEnded?: boolean; // 승리
    eliminatedPlayerIds?: string[]; // 파산
    message?: string; // 클라이언트 알림 메시지
}

export class SkillManager {
    constructor(
        private state: GameStateSchema,
        private deck: Deck,
        private turnManager: TurnManager,
        private engine: OneCardEngine // 승리 조건 체크 등 활용 가능
    ) { }

    // 스킬 사용 메인 진입점
    useSkill(sessionId: string, skillId: CharacterId, targetId?: string, selectedCardId?: string): SkillResult {
        const player = this.state.players.get(sessionId);
        if (!player) return { success: false, error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: "Player not found" } };

        // 1. 공통 검증 (턴, 이미 행동 여부, 쿨타임)
        const validation = this.validateSkillUse(sessionId, player, skillId);
        if (!validation.success) return validation;

        // 2. 스킬별 로직 실행
        return this.executeSkill(sessionId, player, skillId, targetId, selectedCardId);
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
        selectedCardId?: string
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
                        if (card) player.hand.push(card as any);
                    }
                    this.state.attackStack = 0; // 데미지 받음 -> 스택 초기화
                    result.message = "Blocked 2 damage and took remainder.";
                } else {
                    result.message = "Blocked all damage.";
                }
                break;

            case 'thief': // 도둑: 이전/다음 플레이어에게서 1장씩 강탈
                const playerIds = Array.from(this.state.players.keys());
                const myIndex = playerIds.indexOf(sessionId);
                const prevIndex = (myIndex - 1 + playerIds.length) % playerIds.length;
                const nextIndex = (myIndex + 1) % playerIds.length;

                const prevId = playerIds[prevIndex];
                const nextId = playerIds[nextIndex];

                // 자신 제외 (2인 플레이 시 서로 뺏기?)
                if (prevId === sessionId) break; // 혼자일때

                [prevId, nextId].forEach(pid => {
                    const p = this.state.players.get(pid);
                    if (p && p.hand.length > 0) {
                        const randIdx = Math.floor(Math.random() * p.hand.length);
                        const [stolen] = p.hand.splice(randIdx, 1);
                        player.hand.push(stolen);
                        affectedPlayers.add(pid);
                    }
                });
                result.message = "Stole cards from neighbors.";
                break;

            case 'prophet': // 예언자: 다음 플레이어 카드 3장 확인 (통신만 하면 됨, 상태 변경 없음)
                // 실제 구현은 Room에서 send("prophet_result", ...) 로 처리하거나 여기서 결과 리턴
                // 여기서는 상태 변경이 없으므로 성공 처리만.
                // Room에서 별도로 처리하거나, message에 정보를 담을 수 있음.
                // 하지만 보안상 개인 메시지로 보내야 함.
                result.message = "Peeked next player's cards.";
                // (실제 데이터 전송 로직은 Room의 onMessage에서 처리 권장, 혹은 여기서 리턴값에 포함)
                break;

            case 'shaman': // 주술사: 타겟 지정 (강제 스킬)
                if (!targetId) return { success: false, error: { message: "Target required" } };
                const targetS = this.state.players.get(targetId);
                if (!targetS) return { success: false, error: { message: "Invalid target" } };

                // 타겟에게 'shaman_cursed' 효과 부여
                // (이 효과는 Target의 턴 시작 시 체크하여 강제 사용 유도)
                targetS.activeEffects.push("shaman_cursed");
                // 주술사와 타겟은 스킬 사용 전까지 쿨타임 고정 (이는 Cooldown 로직에서 처리)

                result.message = "Cursed target to use skill.";
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
                const subResult = this.executeSkill(sessionId, player, copiedSkill, targetId /* Some skills need target */, selectedCardId);
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
                    if (c) targetA.hand.push(c as any);
                }
                affectedPlayers.add(targetId);
                result.message = "Assassinated target with 3 cards.";
                break;

            case 'berserker': // 광전사: 나 1장, 타겟들 3장
                // 타겟이 복수여야 함. targetId 인자를 배열로 받거나 comma separated string?
                // 일단 단순화를 위해 구현: (Client sends targetId array logic needed, currently taking 1 targetId)
                // 임시: targetId 가 하나만 오면 그 사람 + 랜덤 1명? 
                // 혹은 Rulebook says "Select 2 targets".
                // For now, let's assume implementation detail handles logic.
                // -> Simplified: Self draw 1. (MVP)
                if (this.deck.count === 0) this.deck.replenish();
                const c = this.deck.draw();
                if (c) player.hand.push(c as any);

                // Target logic placeholder (needs protocol update for multiple targets)
                if (targetId) {
                    const t = this.state.players.get(targetId);
                    if (t) {
                        for (let i = 0; i < 3; i++) {
                            if (this.deck.count === 0) this.deck.replenish();
                            const c2 = this.deck.draw();
                            if (c2) t.hand.push(c2 as any);
                        }
                        affectedPlayers.add(targetId);
                    }
                }

                affectedPlayers.add(sessionId);
                result.message = "Berserker rage!";
                break;
        }

        // 3. 비용 지불 (쿨타임 리셋 / 횟수 차감)
        if (skillId === 'summoner' || skillId === 'berserker') {
            player.skillUsesLeft--;
        } else {
            player.skillProgress = 0; // 게이지 초기화
        }

        // 3-1. 주술사 저주 해제 (스킬 사용으로 순응함)
        const curseIdx = player.activeEffects.indexOf("shaman_cursed");
        if (curseIdx !== -1) {
            player.activeEffects.splice(curseIdx, 1);
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

        // 주술사 저주 체크 ('shaman_cursed')
        // 만약 저주 상태라면, 이번 턴에 무조건 스킬을 써야 함.
        // 클라이언트에게 "Must use skill" 플래그를 보낼 수 있음 (ActiveEffects로 이미 동기화됨)
        // 사용자가 스킬을 안 쓰고 턴을 넘기려 하면(카드 내기/뽑기), Engine/Room에서 막거나 자동 발동?
        // 기획서: "거부 시 카드 3장" -> 턴을 넘기려 할 때 체크해야 함.
        // 이는 OneCardEngine.processCardPlay나 MafiaRoom.handleDraw에서 체크 필요.
    }
}
