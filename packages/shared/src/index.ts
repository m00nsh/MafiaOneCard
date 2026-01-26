// ============================================================================
// Colyseus Schema v3 Imports
// ============================================================================

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

// ============================================================================
// 공유 상수
// ============================================================================

export const SHARED_CONSTANT = "Hello from shared";

// ============================================================================
// 카드 시스템
// ============================================================================

export type CardSuit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB' | 'JOKER';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'BLACK' | 'COLOR';

// 기존 인터페이스 (호환성 유지)
export interface Card {
    id: string;
    suit: CardSuit;
    rank: CardRank;
}

// Schema v3: Card 클래스 (Colyseus 동기화용)
export class CardSchema extends Schema implements Card {
    @type("string") id!: string;
    @type("string") suit!: CardSuit;
    @type("string") rank!: CardRank;

    constructor(id?: string, suit?: CardSuit, rank?: CardRank) {
        super();
        if (id !== undefined) this.id = id;
        if (suit !== undefined) this.suit = suit;
        if (rank !== undefined) this.rank = rank;
    }
}

// 카드 효과 타입
export type CardEffectType = 'attack' | 'changeSuit' | 'skip' | 'reverse' | 'plusOne' | 'normal';

export interface CardEffect {
    type: CardEffectType;
    value?: number; // 공격 카드의 경우 공격량 (2, 3, 5, 8)
    description: string;
}

// 카드 효과 매핑 (Rank → Effect)
export const CARD_EFFECTS: Record<CardRank, CardEffect> = {
    'A': { type: 'attack', value: 3, description: '다음 플레이어 3장 공격' },
    '2': { type: 'attack', value: 2, description: '다음 플레이어 2장 공격' },
    '3': { type: 'normal', description: '일반 카드' },
    '4': { type: 'normal', description: '일반 카드' },
    '5': { type: 'normal', description: '일반 카드' },
    '6': { type: 'normal', description: '일반 카드' },
    '7': { type: 'changeSuit', description: '문양 변경' },
    '8': { type: 'normal', description: '일반 카드' },
    '9': { type: 'normal', description: '일반 카드' },
    '10': { type: 'normal', description: '일반 카드' },
    'J': { type: 'skip', description: '다음 플레이어 스킵' },
    'Q': { type: 'reverse', description: '진행 방향 반전' },
    'K': { type: 'plusOne', description: '한 장 더 내기' },
    'BLACK': { type: 'attack', value: 5, description: '다음 플레이어 5장 공격 (흑백 조커)' },
    'COLOR': { type: 'attack', value: 8, description: '다음 플레이어 8장 공격 (컬러 조커)' },
};

// ============================================================================
// 캐릭터 시스템
// ============================================================================

export type CharacterId = 
    | 'merchant'      // 잡상인
    | 'tank'          // 탱커
    | 'thief'         // 도둑
    | 'prophet'       // 예언자
    | 'shaman'        // 주술사
    | 'summoner'      // 소환사
    | 'assassin'      // 암살자
    | 'berserker';    // 광전사

export interface CharacterSkill {
    id: CharacterId;
    name: string;
    description: string;
    cooldown: number; // 턴 수 (0이면 사용 횟수 제한)
    maxUses?: number; // 최대 사용 횟수 (cooldown이 0인 경우)
}

export const CHARACTER_SKILLS: Record<CharacterId, CharacterSkill> = {
    merchant: {
        id: 'merchant',
        name: '잡상인',
        description: '내 카드 중 한 장을 선택해 특정 플레이어에게 강제로 넘김',
        cooldown: 3,
    },
    tank: {
        id: 'tank',
        name: '탱커',
        description: '나에게 들어온 공격 카드의 누적치를 50% 감쇄 (소수점 올림)',
        cooldown: 4,
    },
    thief: {
        id: 'thief',
        name: '도둑',
        description: '이전/다음 턴 플레이어의 패에서 각각 1장씩 무작위로 가져와 섞음',
        cooldown: 3,
    },
    prophet: {
        id: 'prophet',
        name: '예언자',
        description: '이전 플레이어가 덱에서 가져간 카드 또는 보유한 패를 확인',
        cooldown: 3,
    },
    shaman: {
        id: 'shaman',
        name: '주술사',
        description: '특정 플레이어를 지목해 스킬을 강제로 사용시키기 (거부 시 카드 3장)',
        cooldown: 3,
    },
    summoner: {
        id: 'summoner',
        name: '소환사',
        description: '다른 플레이어의 스킬을 뺏어서 사용',
        cooldown: 0,
        maxUses: 1,
    },
    assassin: {
        id: 'assassin',
        name: '암살자',
        description: '특정 플레이어 1명을 지목해 카드 3장 부여',
        cooldown: 5,
    },
    berserker: {
        id: 'berserker',
        name: '광전사',
        description: '자신이 카드 3장을 먹고 5장 먹이는 공격 시전하기',
        cooldown: 0,
        maxUses: 2,
    },
};

// ============================================================================
// 게임 모드 및 상태
// ============================================================================

export type GameMode = 'custom' | 'quick';
export type RoomStatus = 'LOBBY' | 'PLAYING' | 'ENDED';
export type GameDirection = 'clockwise' | 'counter-clockwise';

// ============================================================================
// 플레이어 정보
// ============================================================================

export interface PlayerInfo {
    id: string; // sessionId 또는 playerId
    nickname: string;
    characterId: CharacterId | null;
    isReady: boolean;
    isHost: boolean;
    handCount?: number; // 클라이언트는 자신의 핸드만 볼 수 있음
    skillCooldown?: number; // 현재 스킬 쿨타임
    skillUsesLeft?: number; // 남은 스킬 사용 횟수 (소환사, 광전사)
}

// ============================================================================
// 게임 상태
// ============================================================================

// 기존 인터페이스 (호환성 유지)
export interface GameState {
    roomId: string;
    status: RoomStatus;
    currentTurn: string | null; // 현재 턴인 플레이어의 sessionId
    direction: GameDirection;
    attackStack: number; // 누적된 공격 카드 수
    topCard: Card | null; // 현재 바닥에 놓인 카드
    selectedSuit: CardSuit | null; // 7 카드로 변경된 문양
    deckCount: number; // 남은 덱 카드 수
    players: Record<string, PlayerInfo>; // 플레이어 정보 맵 (key: sessionId)
    winnerId: string | null; // 승리한 플레이어 ID
}

// ============================================================================
// Schema v3: Colyseus 동기화용 클래스
// ============================================================================

// Schema v3: Player 클래스 (플레이어 핸드 관리)
export class PlayerSchema extends Schema {
    @type([CardSchema]) hand = new ArraySchema<CardSchema>();
    @type("boolean") isReady: boolean = false;
    @type("string") nickname: string = "";
    @type("string") characterId: string = ""; // CharacterId | null을 string으로 저장
    @type("boolean") isHost: boolean = false;
    @type("number") skillCooldown: number = 0;
    @type("number") skillUsesLeft: number = 0;
}

// Schema v3: GameState 클래스 (게임 전체 상태)
export class GameStateSchema extends Schema {
    @type("string") status: string = "LOBBY"; // RoomStatus
    @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
    @type("string") currentTurn: string = ""; // 현재 턴인 플레이어의 sessionId
    @type("string") direction: string = "clockwise"; // GameDirection
    @type("number") attackStack: number = 0; // 누적된 공격 카드 수
    @type(CardSchema) topCard: CardSchema | null = null; // 현재 바닥에 놓인 카드
    @type("string") selectedSuit: string = ""; // CardSuit | null을 string으로 저장
    @type("number") deckCount: number = 0; // 남은 덱 카드 수
    @type("string") winnerId: string = ""; // 승리한 플레이어 ID
}

// ============================================================================
// 게임 상수
// ============================================================================

export const GAME_CONSTANTS = {
    // 카드 관련
    INITIAL_HAND_SIZE: 7, // 게임 시작 시 플레이어당 카드 수
    MAX_HAND_SIZE: 20, // 최대 보유 카드 수 (파산 조건)
    TOTAL_CARDS: 54, // 전체 카드 수 (52장 + 조커 2장)
    
    // 공격 카드 값
    ATTACK_2: 2,
    ATTACK_A: 3,
    ATTACK_JOKER_BLACK: 5,
    ATTACK_JOKER_COLOR: 8,
    
    // 방 관련
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 5,
    ROOM_CODE_LENGTH: 6, // 초대 코드 길이
    
    // 스킬 관련
    TANK_DAMAGE_REDUCTION: 0.5, // 탱커 스킬: 50% 감쇄
    ASSASSIN_CARD_COUNT: 3, // 암살자 스킬: 3장 부여
    BERSERKER_SELF_DAMAGE: 3, // 광전사: 자신 3장
    BERSERKER_ATTACK_DAMAGE: 5, // 광전사: 상대 5장
    SHAMAN_PENALTY: 3, // 주술사 거부 시 페널티: 3장
} as const;

// ============================================================================
// 클라이언트 → 서버 메시지 타입
// ============================================================================

export interface CardPlayMessage {
    cardId: string;
    suit: CardSuit;
    rank: CardRank;
    selectedSuit?: CardSuit; // 7 카드 사용 시 선택한 문양
}

export interface DrawCardMessage {
    // 빈 메시지 (카드 뽑기 요청)
}

export interface ReadyMessage {
    isReady: boolean;
}

export interface UseSkillMessage {
    skillId: CharacterId;
    targetPlayerId?: string; // 대상 플레이어 (필요한 스킬의 경우)
    selectedCardId?: string; // 선택한 카드 (잡상인 스킬의 경우)
    selectedSuit?: CardSuit; // 선택한 문양 (필요한 경우)
}

export interface EndTurnMessage {
    // 빈 메시지 (턴 종료 요청)
}

// ============================================================================
// 서버 → 클라이언트 메시지 타입
// ============================================================================

export interface GameStartMessage {
    initialCard: Card; // 게임 시작 시 바닥에 놓인 초기 카드
}

export interface CardPlayResponseMessage {
    success: boolean;
    error?: string;
    newTopCard?: Card;
    attackStack?: number;
}

export interface DrawCardResponseMessage {
    success: boolean;
    error?: string;
    drawnCard?: Card;
}

export interface TurnChangeMessage {
    currentTurn: string; // 현재 턴인 플레이어의 sessionId
    direction: GameDirection;
}

export interface AttackMessage {
    targetPlayerId: string;
    attackAmount: number;
    totalAttackStack: number;
}

export interface GameEndMessage {
    winnerId: string;
    reason: 'hand_empty' | 'burst'; // 승리 이유
}

export interface SkillUsedMessage {
    playerId: string;
    skillId: CharacterId;
    targetPlayerId?: string;
}

export interface AnnouncementMessage {
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
}

// ============================================================================
// 기타 타입 (레거시 호환성)
// ============================================================================

// 기존 코드 호환성을 위한 타입 (점진적 마이그레이션용)
export type PlayerRole = 'mafia' | 'citizen' | 'doctor' | 'police';
