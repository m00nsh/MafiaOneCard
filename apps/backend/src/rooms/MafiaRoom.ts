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

        // Turn Listener for Cooldowns & Timer
        this.turnManager.onTurnChange = (playerId) => {
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

        // 4. Lobby Timer (Quick Mode)
        // Only if Bots are enabled. If disabled, wait for manual start or full room.
        if (GAME_CONSTANTS.ENABLE_BOTS && (options.mode === 'quick' || !options.mode)) {
            this.startTimer(10, () => this.fillBotsAndStart());
        }
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
        console.log(`Turn timeout for ${playerId}`);
        // Force Draw 1 Card & Next Turn
        const player = this.state.players.get(playerId);
        if (!player) return;

        // Reuse Draw Logic (Simplified)
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

    private fillBotsAndStart() {
        if (this.state.status !== "LOBBY") return;

        console.log("Lobby timeout -> Filling bots...");

        const currentCount = this.state.players.size;
        const targetCount = GAME_CONSTANTS.MAX_PLAYERS;

        if (currentCount >= targetCount) {
            this.startGame();
            return;
        }

        const needed = targetCount - currentCount;
        const existingIds = Array.from(this.state.players.keys());

        for (let i = 0; i < needed; i++) {
            const { sessionId, player } = this.botManager.createBot(existingIds);
            this.state.players.set(sessionId, player);
            existingIds.push(sessionId);
        }

        this.broadcast("announcement", `Added ${needed} AI bots.`);
        this.startGame();
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
            if (this.state.players.size < 2) return;

            let allReady = true;
            this.state.players.forEach((player) => {
                if (!player.isReady) allReady = false;
            });

            if (allReady) {
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
        const player = new PlayerSchema();
        if (options?.name) player.nickname = options.name;
        if (options?.characterId) {
            player.characterId = options.characterId;
            console.log(`${client.sessionId} selected character: ${options.characterId}`);
        }
        if (this.state.players.size === 0) player.isHost = true;
        this.state.players.set(client.sessionId, player);
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
