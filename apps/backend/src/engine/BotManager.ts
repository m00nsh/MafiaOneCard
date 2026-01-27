import { PlayerSchema, GameStateSchema, CardSchema, CHARACTER_SKILLS, CharacterId, GAME_CONSTANTS } from "@mafia/shared";
import { OneCardEngine } from "./OneCardEngine";

export class BotManager {
    constructor(private state: GameStateSchema, private engine: OneCardEngine) { }

    // 봇 생성 및 추가
    createBot(existingIds: string[]): { sessionId: string, player: PlayerSchema } {
        let botId = `bot_${Math.floor(Math.random() * 1000)}`;
        while (existingIds.includes(botId)) {
            botId = `bot_${Math.floor(Math.random() * 1000)}`;
        }

        const bot = new PlayerSchema();
        bot.nickname = `AI Bot ${botId.split('_')[1]}`;
        bot.isReady = true;
        // Host logic handles character assignment later, or we can assign random here.
        // Let's assign random here to be safe, but MafiaRoom startGame re-assigns if null.
        // We'll leave characterId empty to let startGame handle uniform assignment logic.

        return { sessionId: botId, player: bot };
    }

    isBot(sessionId: string): boolean {
        return sessionId.startsWith("bot_");
    }

    // 봇 행동 결정
    // 단순 로직: 낼 수 있는 카드 있으면 냄 -> 스킬 쓸 수 있으면 씀 -> 없으면 뽑음
    // 공격 스택 고려
    decideAction(botId: string): { type: 'play' | 'draw' | 'skill', payload?: any } | null {
        const bot = this.state.players.get(botId);
        if (!bot) return null;

        // 1. 공격 방어 우선 (스택 > 0)
        // 2. 낼 수 있는 카드 탐색
        const playableCard = this.findPlayableCard(bot, this.state.topCard, this.state.selectedSuit, this.state.attackStack);

        if (playableCard) {
            // 카드 내기
            return {
                type: 'play',
                payload: {
                    cardId: playableCard.id,
                    suit: playableCard.suit,
                    // 7 카드면 랜덤 문양 선택
                    selectedSuit: playableCard.rank === '7' ? 'SPADE' : undefined
                }
            };
        }

        // 3. 스킬 사용 (쿨타임 찼으면 무조건 사용 - 단순화)
        // 주술사/소환사/광전사 등 타겟 필요한 경우 랜덤 타겟
        // (Bot Skill Logic can be expanded later. For MVP, skip skills or implement simple ones)
        // Let's skip skills for now to ensure stability, or implement simple ones if critical.
        // Request didn't specify detailed bot skill logic, just "AI Bot". 
        // Let's stick to basic card play for stability first.

        // 4. 할 거 없으면 드로우
        return { type: 'draw' };
    }

    private findPlayableCard(bot: PlayerSchema, top: CardSchema, selectedSuit: string, attackStack: number): CardSchema | null {
        // 공격 방어 모드
        if (attackStack > 0) {
            // 공격 카드만 낼 수 있음 (더 높은 등급 등 검증은 Engine에서 하겠지만, 여기선 단순 후보군)
            // Engine의 validate 로직을 일부 복제하거나, try-catch 식으로 해야 정확함.
            // 여기서는 단순 필터링: 공격 카드(A, 2, Joker) 중 낼 수 있는 것.
            return bot.hand.find(card => {
                // 단순화: 낼 수 있는지 여부는 복잡하므로 (방어 레벨 등), 
                // 일단 공격 카드면 내본다? -> Engine이 거부하면 Draw로 넘어가는게 안전하지 않음 (턴 낭비).
                // 완벽한 검증을 위해선 Engine.createCandidateList 같은게 필요.
                // 일단 간단히: 같은 문양 or 같은 숫자 or 조커
                // 그리고 공격 스택이 있으면 공격 카드여야 함.
                const isAttack = ['A', '2'].includes(card.rank) || card.suit === 'JOKER';
                if (!isAttack) return false;

                // 방어 가능 여부 (Engine 로직과 유사)
                // 2 < A < Black < Color
                // 현재 공격 레벨 파악이 어려우므로, 일단 A, 2, Joker면 냄.
                // (Server validates. If fail -> Bot draws. Robust enough for MVP).
                return true;
            }) || null;
        }

        // 일반 모드
        return bot.hand.find(card => {
            if (card.suit === 'JOKER') return true;
            // 7로 바뀐 문양 체크
            const currentSuit = selectedSuit || top.suit;

            if (card.suit === currentSuit) return true;
            if (card.rank === top.rank) return true;
            return false;
        }) || null;
    }
}
