# Shared 타입 마이그레이션 가이드

이 문서는 프론트엔드 코드를 `@mafia/shared` 패키지의 타입을 사용하도록 마이그레이션하는 방법을 설명합니다.

## 📋 현재 상황 분석

### 백엔드 (`MafiaRoom.ts`) 코드 설명

```typescript
import { Card, CardSuit, CardRank } from "@mafia/shared";
```

#### 1. **타입 정의 위치**
- 백엔드는 `@mafia/shared` 패키지에서 타입을 import합니다.
- 이는 프론트엔드와 백엔드가 **동일한 타입 정의를 공유**한다는 의미입니다.

#### 2. **CardSchema 클래스**
```typescript
export class CardSchema extends Schema implements Card {
    @type("string") id: string;
    @type("string") suit: CardSuit;
    @type("string") rank: CardRank;
    
    constructor(id: string, suit: CardSuit, rank: CardRank) {
        super();
        this.id = id;
        this.suit = suit;
        this.rank = rank;
    }
}
```

**설명**:
- `CardSchema`는 Colyseus의 `Schema`를 상속하여 **자동 상태 동기화**를 지원합니다.
- `@type("string")` 데코레이터는 Colyseus가 이 필드를 클라이언트와 동기화하도록 지시합니다.
- `implements Card`는 `@mafia/shared`의 `Card` 인터페이스를 구현함을 의미합니다.
- 생성자에서 `CardSuit`와 `CardRank` 타입을 사용하여 타입 안정성을 보장합니다.

#### 3. **덱 생성 로직**
```typescript
createDeck() {
    const suits: CardSuit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
    const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // 일반 카드 52장 생성
    for (const suit of suits) {
        for (const rank of ranks) {
            this.deck.push({ id: `${suit}-${rank}`, suit, rank });
        }
    }
    
    // 조커 2장 추가
    this.deck.push({ id: 'JOKER-BLACK', suit: 'JOKER', rank: 'BLACK' });
    this.deck.push({ id: 'JOKER-COLOR', suit: 'JOKER', rank: 'COLOR' });
}
```

**설명**:
- `CardSuit` 타입: `'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB' | 'JOKER'` (대문자)
- `CardRank` 타입: `'A' | '2' | ... | 'K' | 'BLACK' | 'COLOR'` (조커는 `BLACK`/`COLOR`)
- 카드 ID 형식: `${suit}-${rank}` (예: `"SPADE-A"`, `"JOKER-BLACK"`)

---

## 🔄 타입 불일치 문제

### 현재 프론트엔드 타입
```typescript
// apps/frontend/src/app/utils/gameLogic.ts
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'; // 소문자
export type Rank = 'A' | '2' | ... | 'K' | 'JOKER_BW' | 'JOKER_COLOR'; // JOKER_BW/COLOR
```

### 백엔드/shared 타입
```typescript
// packages/shared/src/index.ts
export type CardSuit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB' | 'JOKER'; // 대문자
export type CardRank = 'A' | '2' | ... | 'K' | 'BLACK' | 'COLOR'; // BLACK/COLOR
export const CARD_EFFECTS: Record<CardRank, CardEffect>; // 카드 효과 정의
export const CHARACTER_SKILLS: Record<CharacterId, CharacterSkill>; // 캐릭터 스킬 정의
export const GAME_CONSTANTS; // 게임 상수 (초기 핸드, 최대 핸드 등)
```

### 불일치 요약

| 항목 | 프론트엔드 | 백엔드/shared | 문제 |
|------|-----------|--------------|------|
| 문양 | 소문자 (`'hearts'`) | 대문자 (`'HEART'`) | 대소문자 불일치 |
| 조커 Rank | `'JOKER_BW'` / `'JOKER_COLOR'` | `'BLACK'` / `'COLOR'` | 값 불일치 |
| 조커 Suit | `'joker'` | `'JOKER'` | 대소문자 불일치 |

---

## ✅ 해결 방안

### 접근 방법 1: Shared 타입 사용 + 변환 유틸리티 (권장)

프론트엔드에서도 `@mafia/shared`의 타입을 사용하되, UI 렌더링을 위한 변환 함수를 제공합니다.

#### 단계 1: 타입 변환 유틸리티 생성

`apps/frontend/src/app/utils/cardConverter.ts` 파일 생성:

```typescript
import { Card, CardSuit, CardRank } from "@mafia/shared";

/**
 * 백엔드/shared 타입을 프론트엔드 UI용 타입으로 변환
 */

// UI 렌더링용 타입 (PlayingCard 컴포넌트에서 사용)
export type UISuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type UIRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER_BW' | 'JOKER_COLOR';

export interface UICard {
  id: string;
  suit: UISuit;
  rank: UIRank;
  isJoker?: boolean;
}

/**
 * 백엔드 CardSuit → UI Suit 변환
 */
export function suitToUI(suit: CardSuit): UISuit {
  const mapping: Record<CardSuit, UISuit> = {
    'SPADE': 'spades',
    'HEART': 'hearts',
    'DIAMOND': 'diamonds',
    'CLUB': 'clubs',
    'JOKER': 'joker',
  };
  return mapping[suit];
}

/**
 * 백엔드 CardRank → UI Rank 변환
 */
export function rankToUI(rank: CardRank): UIRank {
  const mapping: Record<CardRank, UIRank> = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'BLACK': 'JOKER_BW',
    'COLOR': 'JOKER_COLOR',
  };
  return mapping[rank];
}

/**
 * 백엔드 Card → UI Card 변환
 */
export function cardToUI(card: Card): UICard {
  return {
    id: card.id,
    suit: suitToUI(card.suit),
    rank: rankToUI(card.rank),
    isJoker: card.suit === 'JOKER',
  };
}

/**
 * UI Card → 백엔드 Card 변환 (메시지 전송 시 사용)
 */
export function cardFromUI(uiCard: UICard): Card {
  const suitMapping: Record<UISuit, CardSuit> = {
    'spades': 'SPADE',
    'hearts': 'HEART',
    'diamonds': 'DIAMOND',
    'clubs': 'CLUB',
    'joker': 'JOKER',
  };

  const rankMapping: Record<UIRank, CardRank> = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'JOKER_BW': 'BLACK',
    'JOKER_COLOR': 'COLOR',
  };

  return {
    id: uiCard.id,
    suit: suitMapping[uiCard.suit],
    rank: rankMapping[uiCard.rank],
  };
}
```

#### 단계 2: gameLogic.ts 수정

`apps/frontend/src/app/utils/gameLogic.ts` 수정:

```typescript
// @mafia/shared에서 타입 import
import { Card, CardSuit, CardRank } from "@mafia/shared";
import { cardToUI, cardFromUI, UICard } from "./cardConverter";

// 기존 Suit, Rank 타입 제거하고 shared 타입 사용
// export type Suit = ... (제거)
// export type Rank = ... (제거)

// UI용 타입은 cardConverter에서 import
export type { UICard as Card } from "./cardConverter";
export type { UISuit as Suit, UIRank as Rank } from "./cardConverter";

// createDeck 함수는 서버에서 처리하므로 제거하거나 서버용으로 유지
// 클라이언트에서는 서버에서 받은 카드를 변환하여 사용

// canPlayCard 함수는 shared Card 타입 사용
export function canPlayCard(card: Card, topCard: Card, selectedSuit: CardSuit | null): boolean {
  // Jokers can be played on anything
  if (card.suit === 'JOKER') {
    return true;
  }

  // If suit was changed by 7, check against that suit
  const currentSuit = selectedSuit || topCard.suit;

  // Can play if suit matches or rank matches
  return card.suit === currentSuit || card.rank === topCard.rank;
}
```

#### 단계 3: PlayingCard.tsx 수정

`apps/frontend/src/app/components/PlayingCard.tsx` 수정:

```typescript
import { UICard } from '@/app/utils/cardConverter';

interface PlayingCardProps {
  card: UICard; // UICard 타입 사용
  // ... 나머지 props 동일
}

export default function PlayingCard({ card, faceDown, onClick, className = '', style, isPlayable = true }: PlayingCardProps) {
  // getSpriteCoords 함수는 기존 로직 유지 (UICard는 기존 형식과 동일)
  // ...
}
```

#### 단계 4: GameScreen.tsx 수정

`apps/frontend/src/app/components/GameScreen.tsx` 수정:

```typescript
import { Card } from "@mafia/shared"; // 백엔드 타입
import { UICard, cardToUI, cardFromUI } from '@/app/utils/cardConverter'; // UI 타입

export default function GameScreen({ playerCount = 4 }: GameScreenProps) {
  // 서버에서 받은 Card를 UICard로 변환하여 저장
  const [myHand, setMyHand] = useState<UICard[]>([]);
  
  // 서버에서 카드를 받으면 변환
  useEffect(() => {
    if (serverCards) {
      const uiCards = serverCards.map(cardToUI);
      setMyHand(uiCards);
    }
  }, [serverCards]);

  // 카드를 서버로 보낼 때는 다시 변환
  const handlePlayCard = (index: number) => {
    const uiCard = myHand[index];
    const serverCard = cardFromUI(uiCard);
    room.send("card_play", serverCard);
  };
}
```

---

### 접근 방법 2: Shared 타입으로 완전 전환 (대규모 리팩토링)

프론트엔드의 모든 타입을 `@mafia/shared`로 통일하고, UI 렌더링 로직만 수정합니다.

#### 장점
- 타입 일관성 보장
- 변환 로직 불필요

#### 단점
- `PlayingCard.tsx`의 스프라이트 좌표 계산 로직 수정 필요
- 기존 코드 대량 수정 필요

---

## 🎯 권장 사항

**접근 방법 1 (변환 유틸리티)**을 권장합니다:

1. **점진적 마이그레이션**: 기존 UI 코드를 최소한으로 수정
2. **타입 안정성**: 백엔드와 통신 시 타입 일치 보장
3. **유지보수성**: 변환 로직이 한 곳에 집중

---

## 📝 수정 체크리스트

### 필수 수정 사항

- [ ] `apps/frontend/src/app/utils/cardConverter.ts` 생성
- [ ] `apps/frontend/src/app/utils/gameLogic.ts` 수정
  - [ ] `@mafia/shared`에서 타입 import
  - [ ] 변환 함수 사용
- [ ] `apps/frontend/src/app/components/PlayingCard.tsx` 수정
  - [ ] `UICard` 타입 사용
- [ ] `apps/frontend/src/app/components/GameScreen.tsx` 수정
  - [ ] 서버 카드 → UI 카드 변환
  - [ ] UI 카드 → 서버 카드 변환

### 선택 수정 사항

- [ ] `@mafia/shared` 패키지에 UI용 타입 추가 검토
- [ ] 변환 함수 단위 테스트 작성

---

## 🔍 백엔드 코드 상세 설명

### MafiaRoom.ts의 타입 사용 흐름

```typescript
// 1. 타입 import
import { Card, CardSuit, CardRank } from "@mafia/shared";

// 2. CardSchema 정의 (Colyseus Schema)
export class CardSchema extends Schema implements Card {
    @type("string") id: string;
    @type("string") suit: CardSuit;  // 'SPADE' | 'HEART' | ...
    @type("string") rank: CardRank;   // 'A' | '2' | ... | 'BLACK' | 'COLOR'
}

// 3. 덱 생성 시 타입 사용
createDeck() {
    const suits: CardSuit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
    // ...
    this.deck.push({ id: `${suit}-${rank}`, suit, rank });
    // suit는 CardSuit 타입, rank는 CardRank 타입
}

// 4. 카드 분배 시 CardSchema 생성
distributeCards() {
    const card = this.deck.pop(); // Card 타입
    if (card) {
        // Card → CardSchema 변환
        player.hand.push(new CardSchema(card.id, card.suit, card.rank));
    }
}
```

### 핵심 포인트

1. **타입 안정성**: `CardSuit`와 `CardRank`는 타입스크립트가 컴파일 타임에 검증합니다.
2. **상태 동기화**: `CardSchema`는 Colyseus가 자동으로 클라이언트에 동기화합니다.
3. **일관성**: 백엔드와 프론트엔드가 동일한 타입 정의를 사용하면 버그를 줄일 수 있습니다.

---

## 📦 Shared 패키지의 추가 타입 및 상수

### 카드 효과 시스템

`@mafia/shared`에는 모든 카드의 효과가 정의되어 있습니다:

```typescript
import { CARD_EFFECTS, CardEffect } from "@mafia/shared";

// 카드 효과 확인 (서버 CardRank 사용)
const aceEffect = CARD_EFFECTS['A']; // { type: 'attack', value: 3, ... }
const jokerEffect = CARD_EFFECTS['BLACK']; // { type: 'attack', value: 5, ... }

// 프론트엔드에서는 UI Rank로 변환하여 사용
// gameLogic.ts에서 이미 변환된 CARD_EFFECTS를 제공합니다.
```

### 캐릭터 스킬 시스템

```typescript
import { CHARACTER_SKILLS, CharacterId } from "@mafia/shared";

// 캐릭터 스킬 정보 확인
const merchantSkill = CHARACTER_SKILLS.merchant;
// {
//   id: 'merchant',
//   name: '잡상인',
//   description: '내 카드 중 한 장을 선택해 특정 플레이어에게 강제로 넘김',
//   cooldown: 3
// }
```

### 게임 상수

```typescript
import { GAME_CONSTANTS } from "@mafia/shared";

// 게임 규칙 상수 사용
const initialHandSize = GAME_CONSTANTS.INITIAL_HAND_SIZE; // 7
const maxHandSize = GAME_CONSTANTS.MAX_HAND_SIZE; // 20
const attackA = GAME_CONSTANTS.ATTACK_A; // 3
```

### 메시지 타입

클라이언트와 서버 간 통신을 위한 타입이 정의되어 있습니다:

```typescript
import { 
  CardPlayMessage, 
  DrawCardMessage, 
  ReadyMessage,
  UseSkillMessage,
  GameStartMessage,
  CardPlayResponseMessage 
} from "@mafia/shared";

// 카드 내기 메시지 전송
const message: CardPlayMessage = {
  cardId: "SPADE-A",
  suit: "SPADE",
  rank: "A"
};
room.send("card_play", message);
```

### 게임 상태 타입

```typescript
import { GameState, PlayerInfo, RoomStatus, GameDirection } from "@mafia/shared";

// 게임 상태 구조
const gameState: GameState = {
  roomId: "room-123",
  status: "PLAYING", // RoomStatus 타입
  currentTurn: "player-1",
  direction: "clockwise", // GameDirection 타입
  attackStack: 5,
  topCard: { id: "SPADE-A", suit: "SPADE", rank: "A" },
  selectedSuit: null,
  deckCount: 30,
  players: { ... },
  winnerId: null
};
```

---

**문서 작성일**: 2025년 1월  
**최종 수정일**: 2025년 1월  
**버전**: 1.1.0
