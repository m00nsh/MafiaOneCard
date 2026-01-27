import { GameStateSchema } from "@mafia/shared";

export class TurnManager {
    // Callback for external listeners (e.g., SkillManager cooldowns)
    public onTurnChange?: (playerId: string) => void;

    constructor(private state: GameStateSchema) { }

    // 다음 턴으로 진행
    nextTurn(skipNext: boolean = false) {
        const playerIds = Array.from(this.state.players.keys());
        if (playerIds.length === 0) return;

        const currentIndex = playerIds.indexOf(this.state.currentTurn);
        if (currentIndex === -1 && this.state.currentTurn !== "") {
            // currentTurn invalid or empty, maybe verify logic
        }

        let nextIndex: number;

        // 방향에 따른 인덱스 계산
        if (this.state.direction === 'clockwise') {
            nextIndex = (currentIndex + 1) % playerIds.length;
        } else {
            nextIndex = (currentIndex - 1 + playerIds.length) % playerIds.length;
        }

        // 스킵(점프) 처리
        if (skipNext) {
            if (this.state.direction === 'clockwise') {
                nextIndex = (nextIndex + 1) % playerIds.length;
            } else {
                nextIndex = (nextIndex - 1 + playerIds.length) % playerIds.length;
            }
        }

        this.state.currentTurn = playerIds[nextIndex];
        console.log(`Turn changed: ${this.state.currentTurn} (Direction: ${this.state.direction})`);

        // Notify listener
        if (this.onTurnChange) {
            this.onTurnChange(this.state.currentTurn);
        }
    }

    // 방향 반전
    reverseDirection() {
        this.state.direction = this.state.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise';
        console.log(`Direction reversed: ${this.state.direction}`);
    }

    // 턴 거리 계산 (랭킹 산정용)
    getTurnDistance(currentIndex: number, targetId: string): number {
        const playerIds = Array.from(this.state.players.keys());
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
