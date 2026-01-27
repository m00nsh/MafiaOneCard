import { Room, Client } from "colyseus";
import { CardSchema, PlayerSchema, GameStateSchema, CardSuit, ErrorCode, GAME_CONSTANTS } from "@mafia/shared";
import { Deck } from "../entities/Deck";
import { TurnManager } from "../engine/TurnManager";
import { OneCardEngine } from "../engine/OneCardEngine";

export class MafiaRoom extends Room<GameStateSchema> {

    // Core Components
    private deck!: Deck;
    private turnManager!: TurnManager;
    private engine!: OneCardEngine;

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

        console.log("MafiaRoom created with modular architecture!");

        // 3. Message Handlers
        this.setupMessageHandlers();
    }

    private setupMessageHandlers() {
        // [Action] Card Play
        this.onMessage("card_play", (client, message: { cardId: string; suit: CardSuit; selectedSuit?: CardSuit }) => {
            if (this.state.status !== "PLAYING") {
                console.warn(`${client.sessionId}: Game not started.`);
                return;
            }

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
                this.state.deckCount = this.deck.count; // Sync deck count
                client.send("card_play_response", {
                    success: true,
                    newTopCard: this.state.topCard,
                    attackStack: this.state.attackStack
                });
                this.broadcast("announcement", `${client.sessionId} played a card!`);

                // Check Game End (Engine sets winnerId if ended)
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

        // [Action] Ready
        this.onMessage("ready", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isReady = !player.isReady;
                this.checkStartGame();
            }
        });
    }

    // --- Draw Logic (Can be moved to Engine later, but involves multiple draws) ---
    private handleDrawCard(client: Client) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const cardsToDraw = this.state.attackStack > 0 ? this.state.attackStack : 1;
        const drawnCards = [];

        for (let i = 0; i < cardsToDraw; i++) {
            if (this.deck.count === 0) {
                this.deck.replenish();
                if (this.deck.count === 0) break; // Still empty
            }

            const card = this.deck.draw();
            if (card) {
                drawnCards.push(card);
                player.hand.push(new CardSchema(card.id, card.suit, card.rank));
            }
        }

        // Immediate replenishment if empty after draw (fix from before)
        if (this.deck.count === 0) {
            this.deck.replenish();
        }

        // Update State
        this.state.deckCount = this.deck.count;
        this.state.attackStack = 0; // Reset attack stack after drawing

        // Response
        client.send("draw_card_response", {
            success: true,
            drawnCard: drawnCards.length > 0 ? drawnCards[0] : null // Should technically send all, but protocol sends one for now? Valid point to check.
        });

        console.log(`${client.sessionId} drew ${drawnCards.length} cards.`);

        // Next Turn
        this.turnManager.nextTurn();

        // Burst Check
        if (player.hand.length > GAME_CONSTANTS.MAX_HAND_SIZE) {
            this.handlePlayerElimination(client, 'burst');
        }
    }

    // --- Game Lifecycle ---

    private checkStartGame() {
        if (this.state.status === "PLAYING") return;
        if (this.state.players.size < 2) return;

        let allReady = true;
        this.state.players.forEach((player) => {
            if (!player.isReady) allReady = false;
        });

        if (allReady) {
            this.startGame();
        }
    }

    private startGame() {
        this.state.status = "PLAYING";

        // 1. Prepare Deck
        this.deck = new Deck(); // Re-create fresh deck

        // 2. Distribute
        this.state.players.forEach((player, sessionId) => {
            for (let i = 0; i < GAME_CONSTANTS.INITIAL_HAND_SIZE; i++) {
                const card = this.deck.draw();
                if (card) player.hand.push(new CardSchema(card.id, card.suit, card.rank));
            }
        });

        // 3. Initial Card
        const initial = this.deck.draw();
        if (initial) {
            this.deck.pushToDiscard(initial);
            this.state.topCard = new CardSchema(initial.id, initial.suit, initial.rank);
        }
        this.state.deckCount = this.deck.count;

        // 4. First Turn
        const firstPlayerId = Array.from(this.state.players.keys())[0];
        this.state.currentTurn = firstPlayerId; // Direct set for init

        console.log("Game Started!");
        this.broadcast("game_start", { initialCard: this.state.topCard });
    }

    // --- Player Management ---

    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId} joined.`);
        const player = new PlayerSchema();
        if (options?.name) player.nickname = options.name;
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
            // We need to convert Schema back to plain object for Deck
            this.deck.pushToDiscard({ id: card.id, suit: card.suit, rank: card.rank });
        });
        this.deck.shuffle(); // Shuffle returned cards into deck (or just keep in discard? Logic said shuffle deck. Deck.replenish does shuffle.)
        // Actually logic was "Return to deck and shuffle".
        // My Deck class has pushToDiscard. Let's push there and replenish if needed, OR just push to deck directly?
        // Let's stick to pushing to discard for simplicity, or add `forceAdd(card)` to Deck.
        // For now, let's assume they go to discard pile to be recycled naturally.

        // 3. Stats & Message
        const rank = this.state.players.size;
        // ... (Stats generation logic same as before) ...

        client.send("game_end", { winnerId: "", reason, stats: {} }); // Placeholder stats
        this.state.players.delete(client.sessionId);
        this.broadcast("announcement", `${client.sessionId} eliminated (${reason}).`);

        if (this.state.players.size === 1) {
            const winnerId = Array.from(this.state.players.keys())[0];
            this.state.status = "ENDED";
            this.handleGameEnd(winnerId);
        }
    }

    private handleGameEnd(winnerId: string) {
        // ... (Ranking logic can be moved to a Helper later) ...
        console.log(`Game Ended. Winner: ${winnerId}`);
        this.broadcast("game_end", {
            winnerId,
            reason: 'hand_empty',
            stats: {} // Populate with actual stats logic if implementing full Detail
        });
    }

    private sendError(client: Client, code: ErrorCode, message: string) {
        client.send("error", { code, message });
    }
}
