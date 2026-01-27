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

            this.skillManager.onTurnStart(playerId);

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

        // Force Draw 1 Card & Next Turn
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

            // Shaman Penalty Check
            if (this.checkShamanPenalty(client)) return;

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

            // Shaman Penalty Check
            if (this.checkShamanPenalty(client)) return;

            this.handleDrawCard(client);
        });

        // [Action] Use Skill
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

            if (result.message) {
                this.broadcast("announcement", `${client.sessionId} used ${message.skillId}: ${result.message}`);
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

    private checkShamanPenalty(client: Client): boolean {
        const player = this.state.players.get(client.sessionId);
        // Only trigger if actually cursed
        if (!player || !player.activeEffects.includes("shaman_cursed")) return false;

        console.log(`${client.sessionId} refused skill -> Applying Shaman Penalty`);

        // Apply Penalty (Draw 3)
        const penaltyCount = GAME_CONSTANTS.SHAMAN_PENALTY || 3;
        const drawnCards = [];
        for (let i = 0; i < penaltyCount; i++) {
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

        // Remove Curse
        const idx = player.activeEffects.indexOf("shaman_cursed");
        if (idx !== -1) player.activeEffects.splice(idx, 1);

        // Notify
        this.state.deckCount = this.deck.count;
        // Reusing draw_card_response structure, though it expects one card. 
        // We'll just send the first one or generic success. Client might need update to handle 'message'.
        client.send("draw_card_response", { success: true, drawnCard: drawnCards[0] });
        this.broadcast("announcement", `${player.nickname} refused skill use and took ${drawnCards.length} cards penalty!`);

        // Next Turn
        this.turnManager.nextTurn();

        // Burst Check
        if (player.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE) {
            this.handlePlayerElimination(client, 'burst');
        }

        return true;
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

            // Start turn for first player (triggers cooldown update for them)
            this.skillManager.onTurnStart(firstPlayerId);

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
