export const SHARED_CONSTANT = "Hello from shared";

// 1. 플레이어 역할 (기존 doctor, police 유지)
export type PlayerRole = 'mafia' | 'citizen' | 'doctor' | 'police';

// 2. 카드 정보 (새로 추가)
// 2. 카드 정보
export type CardSuit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB' | 'JOKER';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'BLACK' | 'COLOR';

export interface Card {
    id: string;
    suit: CardSuit;
    rank: CardRank;
}

// 3. 게임 상태 (기존 정보와 새로운 정보를 합침)
export interface GameState {
    roomId: string;
    players: string[];
    status: 'waiting' | 'playing' | 'ended';
    // 게임 로직을 위해 추가된 필드들
    currentTurn: string;
    isNight: boolean;
    deckCount: number;
}