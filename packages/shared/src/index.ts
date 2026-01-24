export const SHARED_CONSTANT = "Hello from shared";

// Game rules and types will be added here
export type PlayerRole = 'mafia' | 'citizen' | 'doctor' | 'police';

export interface GameState {
    roomId: string;
    players: string[];
    status: 'waiting' | 'playing' | 'ended';
}
