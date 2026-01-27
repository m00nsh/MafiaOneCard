import { Room, Client, Delayed } from "colyseus";
import { CardSchema, PlayerSchema, GameStateSchema, CardSuit, ErrorCode, GAME_CONSTANTS, CharacterId, CHARACTER_SKILLS, UseSkillMessage, SkillUsedMessage } from "@mafia/shared";
import { Deck } from "../entities/Deck";
import { TurnManager } from "../engine/TurnManager";
import { OneCardEngine } from "../engine/OneCardEngine";
import { SkillManager } from "../engine/SkillManager";
import { BotManager } from "../engine/BotManager";

export class MafiaRoom extends Room<GameStateSchema> {

    // Core Components
    private deck!: Deck;
    private turnManager!: TurnManager;
    private engine!: OneCardEngine;
    private skillManager!: SkillManager;
    private botManager!: BotManager;

    // Timer
    private currentTimer?: Delayed;

    // Game Mode
    private gameMode: 'quick' | 'custom' = 'custom';
    
    // 이전 턴 플레이어 ID (주술사 강제 스킬 체크용)
    private previousTurnPlayerId: string | null = null;

    onCreate(options: any) {
        // 1. State Initialization
        this.setState(new GameStateSchema());
        this.state.status = "LOBBY";
        this.state.direction = "clockwise";
        this.state.attackStack = 0;
        this.state.deckCount = 0;
        this.state.topCard = new CardSchema("", "SPADE", "A");

        // 2. Component Initialization
        this.deck = new Deck();
        this.turnManager = new TurnManager(this.state);
        this.engine = new OneCardEngine(this.state, this.deck, this.turnManager);
        this.skillManager = new SkillManager(this.state, this.deck, this.turnManager, this.engine);
        this.botManager = new BotManager(this.state, this.engine);

        // Store game mode for later use
        this.gameMode = options?.mode || 'custom';

        // Turn Listener for Cooldowns & Timer
        this.turnManager.onTurnChange = (playerId) => {
            // 게임이 진행 중이 아니면 무시
            if (this.state.status !== "PLAYING") {
                console.log(`Turn change ignored - game not playing (status: ${this.state.status})`);
                return;
            }

            // 플레이어가 1명 이하면 게임 종료
            if (this.state.players.size <= 1) {
                console.log(`Only 1 player left, ending game`);
                this.state.status = "ENDED";
                this.handleGameEnd(playerId);
                return;
            }

            // 턴이 넘어가기 전 이전 플레이어의 주술사 강제 스킬 체크
            if (this.previousTurnPlayerId && this.previousTurnPlayerId !== playerId) {
                this.checkShamanForcedSkillBeforeTurnEnd(this.previousTurnPlayerId);
            }

            // 이전 턴 플레이어 ID 업데이트
            this.previousTurnPlayerId = playerId;

            this.skillManager.onTurnStart(playerId);

            // 주술사 강제 스킬 처리 (턴 시작 시 자동 스킬 사용)
            this.handleShamanForcedSkill(playerId);

            // Turn Timer (10s)
            this.startTimer(10, () => this.handleTurnTimeout(playerId));

            // Bot Action
            if (GAME_CONSTANTS.ENABLE_BOTS && this.botManager.isBot(playerId)) {
                this.clock.setTimeout(() => this.processBotTurn(playerId), 1000);
            }
        };

        // 3. Message Handlers Registration (CRITICAL!)
        this.setupMessageHandlers();

        // 4. Lobby Timer는 onJoin에서 플레이어가 접속할 때마다 리셋됨
        // (첫 번째 플레이어 접속 시 onJoin에서 타이머 시작)
    }

    private startTimer(seconds: number, callback: Function) {
        if (this.currentTimer) this.currentTimer.clear();

        this.state.timerEndTime = Date.now() + (seconds * 1000);
        this.currentTimer = this.clock.setTimeout(() => {
            this.clearTimer();
            callback();
        }, seconds * 1000);
    }

    private clearTimer() {
        if (this.currentTimer) {
            this.currentTimer.clear();
            this.currentTimer = undefined;
        }
        this.state.timerEndTime = 0;
    }

    private handleTurnTimeout(playerId: string) {
        // 게임이 진행 중이 아니면 무시
        if (this.state.status !== "PLAYING") {
            console.log(`Turn timeout ignored - game not playing (status: ${this.state.status})`);
            return;
        }

        // 현재 턴이 아니면 무시 (이미 다른 액션이 처리됨)
        if (this.state.currentTurn !== playerId) {
            console.log(`Turn timeout ignored - not current turn (current: ${this.state.currentTurn}, timeout for: ${playerId})`);
            return;
        }

        console.log(`Turn timeout for ${playerId}`);
        const player = this.state.players.get(playerId);
        if (!player) return;

        // 플레이어가 1명만 남았으면 게임 종료
        if (this.state.players.size <= 1) {
            console.log(`Only 1 player left, ending game`);
            this.state.status = "ENDED";
            this.handleGameEnd(playerId);
            return;
        }

        // 7 카드 팝업이 열려있는 경우 (topCard가 7이고 selectedSuit이 비어있음)
        // 랜덤 색깔 선택하고 카드 추가로 가져가지 않고 턴 넘어감
        if (this.state.topCard.rank === '7' && this.state.selectedSuit === '') {
            const suits: CardSuit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            this.state.selectedSuit = randomSuit;
            this.broadcast("announcement", `${player.nickname} timed out. Random suit selected: ${randomSuit}.`);
            this.turnManager.nextTurn();
            return;
        }

        // 공격 스택이 쌓인 경우: 스택만큼 카드 가져가기
        if (this.state.attackStack > 0) {
            if (this.deck.count === 0) this.deck.replenish();
            const cardsToDraw = this.state.attackStack;
            for (let i = 0; i < cardsToDraw; i++) {
                const card = this.deck.draw();
                if (card) player.hand.push(new CardSchema(card.id, card.suit, card.rank));
            }
            this.state.attackStack = 0;
            this.state.deckCount = this.deck.count;
            this.broadcast("announcement", `${player.nickname} timed out and drew ${cardsToDraw} card(s) due to attack stack.`);
            this.turnManager.nextTurn();
            return;
        }

        // 주술사 강제 스킬이 있는 경우 처리 (타이머 만료 시)
        // 일반적으로는 checkShamanForcedSkillBeforeTurnEnd에서 처리되지만,
        // 타이머 만료 시에는 여기서도 체크
        if (player.activeEffects.includes("shaman_forced_skill")) {
            this.checkShamanForcedSkillBeforeTurnEnd(playerId);
            this.turnManager.nextTurn();
            return;
        }

        // 일반 경우: 카드 1장 가져가기
        if (this.deck.count === 0) this.deck.replenish();
        const card = this.deck.draw();
        if (card) player.hand.push(new CardSchema(card.id, card.suit, card.rank));

        this.state.deckCount = this.deck.count;
        this.broadcast("announcement", `${player.nickname} timed out and drew a card.`);

        this.turnManager.nextTurn();
    }

    private processBotTurn(botId: string) {
        if (this.state.status !== "PLAYING" || this.state.currentTurn !== botId) return;

        const action = this.botManager.decideAction(botId);
        if (!action) return;

        if (action.type === 'play' && action.payload) {
            const result = this.engine.processCardPlay(botId, action.payload.cardId, action.payload.selectedSuit);
            if (result.success) {
                this.state.deckCount = this.deck.count;
                this.broadcast("card_play_response", { success: true, newTopCard: this.state.topCard });
                this.broadcast("announcement", `${botId} played a card.`);
                if (result.isGameEnded) this.handleGameEnd(this.state.winnerId);
            } else {
                this.handleTurnTimeout(botId);
            }
        } else {
            this.handleTurnTimeout(botId);
        }
    }

    // Unified Queue Logic: Step 1 (5 seconds)
    private checkLobbyTimerStep1() {
        if (this.state.status !== "LOBBY") return;

        const currentCount = this.state.players.size;
        console.log(`Lobby Step 1 (5s). Players: ${currentCount}`);

        // Condition A: >= 3 Players -> Start immediately
        if (currentCount >= 3) {
            this.broadcast("announcement", "Min players (3) gathered. Starting game!");
            this.startGame();
            return;
        }

        // Condition B: < 3 Players -> Wait 5s more
        this.broadcast("announcement", "Waiting for more players... (Extending 5s)");
        this.startTimer(5, () => this.checkLobbyTimerStep2());
    }

    // Unified Queue Logic: Step 2 (10 seconds total)
    private checkLobbyTimerStep2() {
        if (this.state.status !== "LOBBY") return;

        const currentCount = this.state.players.size;
        console.log(`Lobby Step 2 (10s). Players: ${currentCount}`);

        // Condition A: >= 3 Players -> Start
        if (currentCount >= 3) {
            this.broadcast("announcement", "Starting game!");
            this.startGame();
            return;
        }

        // Condition B: < 3 Players -> Fill Bots (if enabled)
        if (GAME_CONSTANTS.ENABLE_BOTS) {
            const needed = 3 - currentCount;
            const existingIds = Array.from(this.state.players.keys());

            for (let i = 0; i < needed; i++) {
                const { sessionId, player } = this.botManager.createBot(existingIds);
                this.state.players.set(sessionId, player);
                existingIds.push(sessionId);
            }
            this.broadcast("announcement", `Added ${needed} AI bots to reach min players.`);
            this.startGame();
        } else {
            // Wait longer (Loop Step 2)
            this.broadcast("announcement", "Waiting for players...");
            this.startTimer(5, () => this.checkLobbyTimerStep2());
        }
    }

    private setupMessageHandlers() {
        // [Action] Card Play
        this.onMessage("card_play", (client, message: { cardId: string; suit: CardSuit; selectedSuit?: CardSuit }) => {
            if (this.state.status !== "PLAYING") return;
            if (this.state.currentTurn !== client.sessionId) {
                this.sendError(client, ErrorCode.NOT_YOUR_TURN, "Not your turn.");
                return;
            }

            // Logic Delegation
            const result = this.engine.processCardPlay(client.sessionId, message.cardId, message.selectedSuit);

            if (!result.success) {
                client.send("card_play_response", { success: false, error: result.error });
            } else {
                // Success Response
                this.state.deckCount = this.deck.count;
                client.send("card_play_response", {
                    success: true,
                    newTopCard: this.state.topCard,
                    attackStack: this.state.attackStack
                });
                this.broadcast("announcement", `${client.sessionId} played a card!`);

                // 주의: 카드 내기 시 주술사 강제 스킬 체크는 onTurnChange 콜백에서 처리됨
                // (OneCardEngine에서 nextTurn()을 호출하므로, onTurnChange에서 이전 플레이어를 체크)

                // 타이머 재시작 (K 카드로 턴이 넘어가지 않아도 타이머는 재시작)
                // nextTurn()이 호출되지 않았을 수 있으므로 명시적으로 타이머 재시작
                if (this.state.status === "PLAYING" && this.state.currentTurn === client.sessionId) {
                    this.startTimer(10, () => this.handleTurnTimeout(client.sessionId));
                }

                // Check Game End 
                if (result.isGameEnded) {
                    this.handleGameEnd(this.state.winnerId);
                }
            }
        });

        // [Action] Draw Card
        this.onMessage("draw_card", (client, message) => {
            if (this.state.status !== "PLAYING") return;
            if (this.state.currentTurn !== client.sessionId) {
                this.sendError(client, ErrorCode.NOT_YOUR_TURN, "Not your turn.");
                return;
            }

            this.handleDrawCard(client);
        });

        // [Action] Use Skill
        this.onMessage("check_summon_target", (client, message: { targetId: string }) => {
            const result = this.skillManager.checkSummonTarget(message.targetId);
            client.send("summoner_check_result", result);
        });

        this.onMessage("use_skill", (client, message: UseSkillMessage) => {
            if (this.state.status !== "PLAYING") return;

            const result = this.skillManager.useSkill(client.sessionId, message.skillId, message.targetPlayerId, message.selectedCardId, message.targetPlayerIds);

            if (!result.success) {
                client.send("announcement", { message: result.error?.message || "Skill failed", type: "error" });
                return;
            }

            // Broadcast skill usage
            this.broadcast("skill_used", {
                playerId: client.sessionId,
                skillId: message.skillId,
                targetPlayerId: message.targetPlayerId,
                targetPlayerIds: message.targetPlayerIds // Broadcast list too
            } as SkillUsedMessage);

            // 예언자 스킬: 확인한 카드 정보를 예언자에게만 개인 메시지로 전송
            if (message.skillId === 'prophet' && result.prophetCards) {
                const targetPlayer = result.targetPlayerId ? this.state.players.get(result.targetPlayerId) : null;
                const targetPlayerName = targetPlayer?.nickname || '플레이어';
                client.send("prophet_result", {
                    cards: result.prophetCards,
                    targetPlayerId: result.targetPlayerId,
                    targetPlayerName: targetPlayerName,
                    totalCards: targetPlayer ? targetPlayer.hand.length : 0
                });
            }

            if (result.message) {
                // 예언자 스킬의 경우, 다른 플레이어들에게는 일반적인 메시지만 브로드캐스트
                // (카드 정보는 예언자에게만 전송됨)
                if (message.skillId === 'prophet') {
                    const targetPlayer = result.targetPlayerId ? this.state.players.get(result.targetPlayerId) : null;
                    const targetPlayerName = targetPlayer?.nickname || '플레이어';
                    this.broadcast("announcement", `${client.sessionId} used ${message.skillId}: Peeked at ${targetPlayerName}'s cards.`);
                } else {
                    this.broadcast("announcement", `${client.sessionId} used ${message.skillId}: ${result.message}`);
                }
            }

            // Check Immediate Game End / Elimination from Skill
            if (result.isGameEnded) {
                this.handleGameEnd(this.state.winnerId);
                return;
            }

            if (result.eliminatedPlayerIds && result.eliminatedPlayerIds.length > 0) {
                result.eliminatedPlayerIds.forEach(pid => {
                    // Need client instance... iterate clients?
                    const targetClient = this.clients.find(c => c.sessionId === pid);
                    if (targetClient) this.handlePlayerElimination(targetClient, 'burst');
                });
            }
        });

        // [Action] Ready
        this.onMessage("ready", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isReady = !player.isReady;
                this.checkStartGame();
            }
        });
    }

    /**
     * 주술사 강제 스킬 처리
     * 타겟 플레이어의 턴이 시작되면 클라이언트에게 스킬 사용 신호를 보냄
     * 프론트엔드에서 팝업을 강제로 열어 사용자가 선택할 수 있도록 함
     */
    private handleShamanForcedSkill(playerId: string): void {
        const player = this.state.players.get(playerId);
        if (!player || !player.activeEffects.includes("shaman_forced_skill")) return;

        const skillId = player.characterId as CharacterId;
        if (!skillId) {
            // 캐릭터가 없으면 효과 제거
            const idx = player.activeEffects.indexOf("shaman_forced_skill");
            if (idx !== -1) player.activeEffects.splice(idx, 1);
            return;
        }

        // 스킬 사용 가능 여부 재확인
        const skillInfo = CHARACTER_SKILLS[skillId];
        if (!skillInfo) {
            const idx = player.activeEffects.indexOf("shaman_forced_skill");
            if (idx !== -1) player.activeEffects.splice(idx, 1);
            return;
        }

        // 횟수 제한 스킬 체크
        if (skillInfo.cooldown === 0 && skillInfo.maxUses) {
            if (player.skillUsesLeft <= 0) {
                const idx = player.activeEffects.indexOf("shaman_forced_skill");
                if (idx !== -1) player.activeEffects.splice(idx, 1);
                return;
            }
        } else {
            // 쿨타임 기반 스킬 체크
            if (player.skillProgress < player.skillMaxCooldown) {
                const idx = player.activeEffects.indexOf("shaman_forced_skill");
                if (idx !== -1) player.activeEffects.splice(idx, 1);
                return;
            }
        }

        // 클라이언트에게 스킬 사용 신호 전송 (팝업 강제 오픈)
        // 사용자가 직접 스킬을 선택할 수 있도록 프론트엔드에서 팝업을 열도록 함
        const client = Array.from(this.clients.values()).find(c => c.sessionId === playerId);
        if (client) {
            client.send("shaman_force_skill", {
                skillId: skillId,
                message: "주술사에 의해 스킬을 사용해야 합니다."
            });
        }
    }

    /**
     * 턴이 넘어가기 전 주술사 강제 스킬 사용 여부 체크
     * 스킬을 사용하지 않았다면 카드 3장을 지급 (일반 카드 뽑기와 별개)
     */
    private checkShamanForcedSkillBeforeTurnEnd(playerId: string): void {
        const player = this.state.players.get(playerId);
        if (!player || !player.activeEffects.includes("shaman_forced_skill")) return;

        // 스킬을 사용하지 않았으므로 페널티 적용
        console.log(`${playerId} did not use skill -> Applying Shaman Penalty (3 cards)`);
        
        const penaltyCount = 3;
        for (let i = 0; i < penaltyCount; i++) {
            if (this.deck.count === 0) {
                this.deck.replenish();
                if (this.deck.count === 0) break;
            }
            const card = this.deck.draw();
            if (card) {
                player.hand.push(new CardSchema(card.id, card.suit, card.rank));
            }
        }
        
        this.state.deckCount = this.deck.count;
        
        // 효과 제거
        const idx = player.activeEffects.indexOf("shaman_forced_skill");
        if (idx !== -1) player.activeEffects.splice(idx, 1);
        
        this.broadcast("announcement", `${player.nickname} did not use skill and drew 3 cards due to shaman forced skill.`);
        
        // 파산 체크
        if (player.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE) {
            const client = Array.from(this.clients.values()).find(c => c.sessionId === playerId);
            if (client) {
                this.handlePlayerElimination(client, 'burst');
            }
        }
    }

    private handleDrawCard(client: Client) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const cardsToDraw = this.state.attackStack > 0 ? this.state.attackStack : 1;
        const drawnCards = [];

        for (let i = 0; i < cardsToDraw; i++) {
            if (this.deck.count === 0) {
                this.deck.replenish();
                if (this.deck.count === 0) break;
            }

            const card = this.deck.draw();
            if (card) {
                drawnCards.push(card);
                player.hand.push(new CardSchema(card.id, card.suit, card.rank));
            }
        }

        if (this.deck.count === 0) {
            this.deck.replenish();
        }

        this.state.deckCount = this.deck.count;
        this.state.attackStack = 0;

        client.send("draw_card_response", {
            success: true,
            drawnCard: drawnCards.length > 0 ? drawnCards[0] : null
        });

        console.log(`${client.sessionId} drew ${drawnCards.length} cards.`);

        // 턴이 넘어가기 전 주술사 강제 스킬 체크
        this.checkShamanForcedSkillBeforeTurnEnd(client.sessionId);

        this.turnManager.nextTurn();

        if (player.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE) {
            this.handlePlayerElimination(client, 'burst');
        }
    }

    private checkStartGame() {
        try {
            if (this.state.status === "PLAYING") return;

            // 빠른 게임 모드: 최소 3명 필요
            // 커스텀 게임 모드: 최소 2명 필요
            const minPlayers = this.gameMode === 'quick' ? 3 : 2;
            if (this.state.players.size < minPlayers) return;

            let allReady = true;
            this.state.players.forEach((player) => {
                if (!player.isReady) allReady = false;
            });

            if (allReady) {
                console.log(`All ${this.state.players.size} players ready. Starting game...`);
                this.startGame();
            }
        } catch (e) {
            console.error("Error in checkStartGame:", e);
        }
    }

    private startGame() {
        try {
            console.log("Starting game...");
            this.state.status = "PLAYING";

            // 1. Prepare Deck
            this.deck.create();
            this.deck.shuffle();

            // 2. Assign Random Characters & Init Cooldowns
            const skillKeys = Object.keys(CHARACTER_SKILLS) as CharacterId[];
            if (skillKeys.length === 0) throw new Error("No skills defined");

            this.state.players.forEach((player, sessionId) => {
                // Assign random character if not set (or always random for now)
                if (!player.characterId) {
                    const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
                    player.characterId = randomSkill;
                }

                const skillInfo = CHARACTER_SKILLS[player.characterId as CharacterId];
                if (skillInfo) {
                    if (skillInfo.cooldown === 0) {
                        player.skillUsesLeft = skillInfo.maxUses || 0;
                        player.skillMaxCooldown = 0;
                    } else {
                        player.skillMaxCooldown = skillInfo.cooldown;
                        player.skillProgress = 0; // Start with 0 charge
                    }
                }
            });

            // 3. Distribute
            this.state.players.forEach((player, sessionId) => {
                player.hand.clear(); // Reset hand just in case
                for (let i = 0; i < GAME_CONSTANTS.INITIAL_HAND_SIZE; i++) {
                    const card = this.deck.draw();
                    if (card) player.hand.push(new CardSchema(card.id, card.suit, card.rank));
                }
            });

            // 4. Initial Card
            // 4. Initial Card
            const initial = this.deck.draw();
            if (initial) {
                // Do NOT push to discard yet. It stays as TopCard.
                // Engine will push it to discard when the next card is played.
                this.state.topCard = new CardSchema(initial.id, initial.suit, initial.rank);
            }
            this.state.deckCount = this.deck.count;

            // 5. First Turn
            const firstPlayerId = Array.from(this.state.players.keys())[0];
            this.state.currentTurn = firstPlayerId;

            // 이전 턴 플레이어 ID 초기화 (첫 턴이므로 null)
            this.previousTurnPlayerId = null;

            // Start turn for first player (triggers cooldown update for them)
            this.skillManager.onTurnStart(firstPlayerId);

            // 주술사 강제 스킬 처리 (턴 시작 시 자동 스킬 사용)
            this.handleShamanForcedSkill(firstPlayerId);

            // 첫 번째 플레이어도 10초 타이머 시작
            this.startTimer(10, () => this.handleTurnTimeout(firstPlayerId));

            console.log("Game Started!");
            this.broadcast("game_start", { initialCard: this.state.topCard });
        } catch (e) {
            console.error("Error in startGame:", e);
            this.broadcast("announcement", "Game start failed: " + e);
            this.state.status = "LOBBY"; // Revert to lobby
        }
    }

    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId} joined.`);

        // 빠른 게임 모드로 접속하려는 경우, 진행 중인 게임에 합류 방지
        const requestedMode = options?.mode || 'custom';
        if (requestedMode === 'quick' && this.state.status === "PLAYING") {
            console.log(`[REJECT] 빠른 게임 플레이어가 진행 중인 게임에 접속 시도. 거부합니다.`);
            client.send("announcement", {
                message: "진행 중인 게임이 있습니다. 잠시 후 다시 시도해주세요.",
                type: "error"
            });
            client.leave(1000, "Game already in progress");
            return;
        }

        // 이전 게임이 종료된 상태에서 새로운 플레이어가 접속한 경우 상태 리셋
        if (this.state.status === "ENDED") {
            console.log("Previous game ended. Resetting room state to LOBBY.");
            this.state.status = "LOBBY";
            this.state.currentTurn = "";
            this.state.attackStack = 0;
            this.state.deckCount = 0;
            this.state.topCard = new CardSchema("", "SPADE", "A");
            this.state.selectedSuit = "";
            this.state.winnerId = "";
            this.state.timerEndTime = 0;
            // 기존 플레이어들도 초기화 (또는 모두 제거)
            this.state.players.forEach((player) => {
                player.isReady = false;
                player.hand.clear();
            });
        }

        const player = new PlayerSchema();
        if (options?.name) player.nickname = options.name;
        if (options?.characterId) {
            player.characterId = options.characterId;
            console.log(`${client.sessionId} selected character: ${options.characterId}`);
        }
        if (this.state.players.size === 0) player.isHost = true;

        // 게임 모드 업데이트 (새 플레이어가 빠른 게임 모드로 접속한 경우)
        if (options?.mode) {
            this.gameMode = options.mode;
        }

        // 빠른 게임 모드: 플레이어 입장 시 자동으로 준비 상태로 설정
        if (this.gameMode === 'quick') {
            player.isReady = true;
            console.log(`${client.sessionId} auto-ready in quick match mode.`);
        }

        this.state.players.set(client.sessionId, player);

        // 빠른 게임 모드: 플레이어 접속 시마다 타이머 리셋
        // 마지막 플레이어 접속 시점부터 5초 후 checkLobbyTimerStep1 호출
        // 게임 시작은 타이머가 만료된 후에만 처리 (즉시 시작 방지)
        if (this.gameMode === 'quick' && this.state.status === "LOBBY") {
            console.log(`Player joined. Resetting lobby timer (5s from now)...`);
            this.startTimer(5, () => this.checkLobbyTimerStep1());
        }

        // 커스텀 게임 모드: 플레이어가 준비 버튼을 눌렀을 때만 게임 시작 확인
        // 빠른 게임 모드에서는 타이머가 만료된 후에만 게임 시작 (checkLobbyTimerStep1에서 처리)
        if (this.gameMode === 'custom') {
            this.checkStartGame();
        }
    }

    onLeave(client: Client, consented: boolean) {
        if (this.state.status === "PLAYING") {
            this.handlePlayerElimination(client, 'player_left');
        } else {
            this.state.players.delete(client.sessionId);
        }
    }

    private handlePlayerElimination(client: Client, reason: 'burst' | 'player_left') {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        // 1. Turn Handover
        if (this.state.currentTurn === client.sessionId) {
            this.turnManager.nextTurn();
        }

        // 2. Return Cards
        Array.from(player.hand).forEach(card => {
            this.deck.pushToDiscard({ id: card.id, suit: card.suit, rank: card.rank });
        });
        this.deck.shuffle();

        // 3. Stats & Message
        const rank = this.state.players.size; // 탈락한 시점의 인원 수 = 등수 (예: 4명 중 탈락 -> 4등)
        client.send("game_end", { winnerId: "", reason, stats: { rank, handCount: player.hand.length } });

        this.state.players.delete(client.sessionId);
        this.broadcast("announcement", `${client.sessionId} eliminated (${reason}). Rank: ${rank}`);

        if (this.state.players.size === 1) {
            const winnerId = Array.from(this.state.players.keys())[0];
            this.state.status = "ENDED";
            this.handleGameEnd(winnerId);
        }
    }

    private handleGameEnd(winnerId: string) {
        console.log(`Game Ended. Winner: ${winnerId}`);

        // 랭킹 계산 (남은 카드 적은 순 -> 턴 순서)
        const stats = this.calculateFinalStats(winnerId);

        this.broadcast("game_end", {
            winnerId,
            reason: 'hand_empty',
            stats // { [sessionId]: { rank: 1, handCount: 0 }, ... }
        });
    }

    private calculateFinalStats(winnerId: string): any {
        // 1. Setup Order Info
        const allIds = Array.from(this.state.players.keys());
        const winnerIndex = allIds.indexOf(winnerId);
        const direction = this.state.direction || "clockwise";
        const totalPlayers = allIds.length;

        const players = Array.from(this.state.players.entries()).map(([id, player]) => {
            // Distance Calculation (Tie-Breaker)
            // Lower distance = Higher Rank (played sooner)
            let myIndex = allIds.indexOf(id);
            let distance = 0;

            if (direction === "clockwise") {
                distance = (myIndex - winnerIndex + totalPlayers) % totalPlayers;
            } else {
                distance = (winnerIndex - myIndex + totalPlayers) % totalPlayers;
            }

            return {
                id,
                handCount: player.hand.length,
                distance // 0 for winner
            };
        });

        // 2. Sort Logic
        players.sort((a, b) => {
            // Primary: Hand Count (Lower is better)
            if (a.handCount !== b.handCount) {
                return a.handCount - b.handCount;
            }

            // Secondary: Turn Distance (Lower is better / Sooner turn)
            // If hand counts are equal, the one closer to the winner (in turn order) gets higher rank.
            return a.distance - b.distance;
        });

        // 3. Assign Ranks
        const stats: any = {};
        players.forEach((p, index) => {
            stats[p.id] = {
                rank: index + 1,
                handCount: p.handCount
            };
        });
        return stats;
    }

    private sendError(client: Client, code: ErrorCode, message: string) {
        client.send("error", { code, message });
    }
}
