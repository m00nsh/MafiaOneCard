# 백엔드 기술 문서 (Backend Technical Documentation)

이 문서는 `apps/backend` 디렉토리의 **현재 구현 기준** 구조, 기술 스택, 게임 서버 로직, 그리고 소켓 통신 방식을 정리한 문서입니다.

## 목차 (Table of Contents)

1. [프로젝트 구조](#1-프로젝트-구조)
2. [기술 스택](#2-기술-스택)
3. [서버 실행 방법](#3-서버-실행-방법)
4. [파일 구조 및 역할](#4-파일-구조-및-역할)
5. [게임 방(Room) 구조](#5-게임-방room-구조)
6. [소켓 통신 흐름](#6-소켓-통신-흐름)
7. [게임 상태 관리](#7-게임-상태-관리)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [테스트 클라이언트](#9-테스트-클라이언트)

---

## 1. 프로젝트 구조

```text
apps/backend/
├── src/
│   ├── index.ts              # 서버 진입점 (Express + Colyseus 설정)
│   ├── rooms/
│   │   └── MafiaRoom.ts      # 게임 방 로직 (로비/매칭/게임 진행 전체 담당)
│   ├── engine/               # 순수 게임 엔진/로직
│   │   ├── OneCardEngine.ts  # 카드 규칙, 공격 스택, 턴 진행(엔진 관점)
│   │   ├── TurnManager.ts    # 턴 순서/방향/타이머와 연동되는 턴 관리
│   │   ├── SkillManager.ts   # 캐릭터 스킬 처리
│   │   └── BotManager.ts     # AI 봇 생성 및 간단한 행동 로직
│   └── entities/
│       ├── Deck.ts           # 덱/버린패(Discard) 관리
│       └── Player.ts         # 서버 내부에서 사용하는 Player 엔티티(필요 시 확장)
├── test-client.ts            # 개발용 테스트 클라이언트
├── package.json              # 의존성 및 스크립트 정의
├── tsconfig.json             # TypeScript 설정
└── dist/                     # 빌드 출력 디렉토리 (빌드 후 생성)
```

---

## 2. 기술 스택

### 핵심 프레임워크 및 라이브러리

| 라이브러리 | 역할 |
|-----------|------|
| **Colyseus 0.16.x** | 실시간 멀티플레이어 게임 서버 프레임워크 (방/매치메이킹/상태 동기화) |
| **@colyseus/schema** | 게임 상태 동기화를 위한 스키마 정의 (`GameStateSchema`, `PlayerSchema`, `CardSchema` 등) |
| **@colyseus/core / ws-transport / monitor** | Colyseus 핵심 기능, WebSocket 전송 계층, 모니터링 대시보드 |
| **Express 5** | HTTP 서버 및 미들웨어 (헬스 체크, Colyseus 모니터 라우팅 등) |
| **@mafia/shared** | 프론트/백엔드 공통 타입 및 상수 (`GAME_CONSTANTS`, 캐릭터/스킬 정의, ErrorCode 등) |

### 개발 도구

| 도구 | 버전 | 역할 |
|------|------|------|
| **TypeScript** | ^5.0.0 | 타입 안정성 |
| **ts-node-dev** | ^2.0.0 | 개발 서버 (핫 리로드) |
| **ts-node** | ^10.9.1 | TypeScript 실행 환경 |

### 주요 기술 특징

- **Colyseus**: Node.js 기반의 실시간 멀티플레이어 게임 서버 프레임워크
  - WebSocket 기반 양방향 통신
  - 자동 상태 동기화 (Schema 기반)
  - 방(Room) 단위 게임 세션 관리
  - 확장 가능한 아키텍처

- **@colyseus/schema**: 효율적인 상태 동기화
  - 변경된 데이터만 클라이언트에 전송 (델타 압축)
  - 타입 안전한 상태 정의
  - 데코레이터 기반 스키마 정의

---

## 3. 서버 실행 방법

### 개발 환경

```bash
# 백엔드 디렉토리로 이동
cd apps/backend

# 의존성 설치 (루트에서 실행 시 자동 설치됨)
pnpm install

# 개발 서버 실행 (핫 리로드 지원)
pnpm dev
```

서버는 기본적으로 **http://localhost:2567** 에서 실행됩니다.

### 프로덕션 빌드

```bash
# TypeScript 컴파일
pnpm build

# 컴파일된 JavaScript 실행
pnpm start
```

### 루트에서 실행

Monorepo 루트에서 실행하는 경우:

```bash
# 개발 서버
pnpm run dev:backend

# 또는 필터 사용
pnpm --filter @mafia/backend dev
```

---

## 4. 파일 구조 및 역할

### `src/index.ts` (서버 진입점)

**역할**: Express 서버와 Colyseus 게임 서버를 초기화하고, `MafiaRoom` 방 타입을 등록합니다.

**주요 기능**:
- Express 앱 생성 및 HTTP 서버 설정
- CORS 설정 (프론트엔드에서 안전하게 접속 가능)
- Colyseus 서버 인스턴스 생성
- `mafia_room` 방 타입 등록 + `filterBy` 메타데이터 설정 (roomCode, mode 기준 매칭)
- Colyseus 모니터 대시보드 설정 (`/colyseus` 경로)

**코드 구조(요약)**:
```ts
const app = express();
app.use(cors());

app.use("/colyseus", monitor() as any);

const server = createServer(app);
const gameServer = new Server({ server });

gameServer.define("mafia_room", MafiaRoom)
  .enableRealtimeListing()
  .filterBy(['roomCode', 'mode']);

app.get('/', (_req, res) => {
  res.send('게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏');
});
```

**접근 가능한 엔드포인트**:
- `GET /`: 서버 상태 확인용 간단한 텍스트 응답
- `GET /colyseus`: Colyseus 모니터 대시보드 (방 목록, 플레이어 수, 메타데이터 등)

---

### `src/rooms/MafiaRoom.ts` (게임 방 로직)

**역할**: 단일 게임 방의 **전체 생명주기**와 **로비/매칭/게임 진행**을 관리하는 핵심 클래스입니다.

**연결되는 주요 컴포넌트**:
- `Deck` (`entities/Deck.ts`): 덱/버린패 관리
- `TurnManager` (`engine/TurnManager.ts`): 턴 순서/방향 및 턴 교체 콜백
- `OneCardEngine` (`engine/OneCardEngine.ts`): 카드 유효성 검사 및 카드 효과 처리
- `SkillManager` (`engine/SkillManager.ts`): 캐릭터 스킬 처리
- `BotManager` (`engine/BotManager.ts`): AI 봇 생성 및 간단한 행동 로직
- 공유 스키마: `GameStateSchema`, `PlayerSchema`, `CardSchema` (`@mafia/shared`)

**핵심 필드/상태**:

- `gameMode: 'quick' | 'custom'`  
  - 빠른 매칭(quick) vs 방 코드 기반 커스텀 게임(custom)
- `roomCode: string | null`  
  - 커스텀 게임용 방 코드 (filterBy 메타데이터에도 저장)
- `maxPlayers: number`  
  - 최대 인원 수 (커스텀 게임은 호스트가 설정, 빠른 게임은 `GAME_CONSTANTS.MAX_PLAYERS`)
- `currentTimer?: Delayed`  
  - 턴 타이머 및 로비 타이머 관리용
- `previousTurnPlayerId: string | null`  
  - 주술사 강제 스킬 페널티 체크용

**주요 상태 흐름**:

- `status: "LOBBY" | "PLAYING" | "ENDED"`  
  - 로비 → 게임 진행 → 종료
- `players: MapSchema<PlayerSchema>`  
  - 각 플레이어의 핸드, 캐릭터, 준비 상태, 방장 여부, 스킬 정보 등 포함
- `attackStack`, `topCard`, `selectedSuit`, `deckCount`, `timerEndTime`, `winnerId`, `maxPlayers` 등

---

## 5. 게임 방(Room) 구조

### 방 생명주기 (Room Lifecycle)

```text
1. onCreate(options)   → 방 생성 시 한 번 실행 (모드/방 코드/최대 인원 설정, 엔진 초기화)
2. onJoin(client, opt) → 플레이어 입장 시 실행 (로비 검증/호스트 부여/빠른 게임 로비 타이머 등)
3. onLeave(client, c)  → 플레이어 퇴장 시 실행 (게임 중 탈락 처리, 로비에서 호스트 위임/방 삭제)
4. onDispose()         → Colyseus 룸 제거 시 호출 (현재는 주로 Colyseus 기본 동작에 의존)
```

### 게임 상태 전환

```text
LOBBY
  ├─ 빠른 게임(quick): 인원/타이머 조건 충족 시 자동 startGame()
  └─ 커스텀(custom): 호스트가 start_game 메시지를 보내고, 모든 비호스트 준비 + 캐릭터 선택 완료 시 startGame()

PLAYING
  └─ 승리/파산/플레이어 탈퇴 등으로 승자가 결정되면 ENDED
```

**전환 조건(요약)**:
- 빠른 게임(quick):  
  - 최소 3명 이상 모이고 로비 타이머(5초/10초)가 만료되거나, 5명 도달 시 즉시 시작  
  - 부족한 인원은 `BotManager`가 AI 봇으로 채움 (최소 3인)
- 커스텀 게임(custom):  
  - 최소 2명 이상  
  - 호스트가 `start_game` 메시지 전송  
  - (캐릭터 선택 전) 모든 비호스트 플레이어 `isReady = true`  
  - (캐릭터 선택 후) 모든 플레이어가 캐릭터 `characterId` 선택 완료

### 서버 전용 데이터 (Schema 외부)

보안을 위해 클라이언트에 직접 노출되지 않는 데이터:

```ts
private deck: Deck;                // 전체 덱 및 버린패 관리 (entities/Deck)
private turnManager: TurnManager;  // 턴 순서/방향/콜백
private engine: OneCardEngine;     // 카드 낼 수 있는지 검증 + 효과 처리
private skillManager: SkillManager;// 캐릭터 스킬 로직
private botManager: BotManager;    // 봇 생성 및 행동 결정
```

이 데이터는 서버 메모리에서만 관리되며, 클라이언트는 자신의 핸드와 공개 정보(topCard, deckCount 등)만 볼 수 있습니다.

---

## 6. 소켓 통신 흐름

### 클라이언트 → 서버 메시지

주요 메시지 타입과 현재 구현은 다음과 같습니다.

| 타입 | 방향 | 설명 |
|------|------|------|
| `ready` | 클 → 서 | 준비 상태 토글 (빠른 게임에서만 자동 시작 조건 검사) |
| `start_game` | 클 → 서 | 커스텀 게임에서 호스트가 누르는 시작 버튼 → 캐릭터 선택 단계로 전환 |
| `select_character` | 클 → 서 | 캐릭터 선택 완료 후 서버에 캐릭터 ID 전달 |
| `card_play` | 클 → 서 | 카드 내기 요청 (카드 ID + 선택 문양) |
| `draw_card` | 클 → 서 | 카드 뽑기 요청 (공격 스택 고려) |
| `use_skill` | 클 → 서 | 캐릭터 스킬 사용 |
| `check_summon_target` | 클 → 서 | 소환사 스킬 타겟 검증 요청 |
| `update_max_players` | 클 → 서 | 커스텀 방에서 호스트가 최대 인원 변경 |

#### 1. 방 참여 (Join / Create Room)

```ts
// 빠른 게임
const room = await client.join("mafia_room", { mode: "quick", name, characterId });

// 커스텀 게임 - 호스트
const room = await client.create("mafia_room", { mode: "custom", roomCode, maxPlayers, name });

// 커스텀 게임 - 게스트
const room = await client.join("mafia_room", { mode: "custom", roomCode, name });
```

**서버 처리(요약)**:
- `onJoin(client, options)` 에서 `mode` / `roomCode` / `maxPlayers` 검증
- 커스텀 모드:  
  - 방 코드 일치 여부 확인, 인원 수 초과 시 거절  
  - 첫 입장자는 호스트로 지정, 방 코드/최대 인원 메타데이터 저장
- 빠른 게임 모드:  
  - 진행 중인 게임에는 새 플레이어 입장 거절  
  - 자동 준비 상태(`isReady = true`) 설정 및 로비 타이머 처리

#### 2. 준비 완료 (Ready)

```ts
room.send("ready");
```

**서버 처리**:
- `player.isReady` 토글
- 빠른 게임(`gameMode === 'quick'`)에서만 `checkStartGame()` 호출 → 모든 인원 준비 시 자동 `startGame()`
- 커스텀 게임에서는 호스트의 `start_game` 메시지가 올 때까지 대기

#### 3. 호스트가 시작 버튼 클릭 (Start Game → 캐릭터 선택)

```ts
room.send("start_game", {});
```

**서버 처리**:
- 발신자가 호스트인지 검증 (`player.isHost`)
- 최소 인원수(빠른 게임 3 / 커스텀 2) 확인
- 모든 비호스트 플레이어가 준비 상태인지 확인
- 조건 만족 시:
  - `broadcast("character_select", {})` 로 모든 클라이언트에 캐릭터 선택 화면 전환 지시

#### 4. 카드 내기 (Card Play)

```ts
room.send("card_play", {
  cardId: "some-card-id",
  suit: "SPADE",
  selectedSuit: "HEART" // 7 카드 등 문양 변경 시
});
```

**서버 처리**:
- `MafiaRoom.onMessage("card_play")` → `OneCardEngine.processCardPlay()` 호출
- 공격 스택/문양/랭크/조커 규칙을 기반으로 낼 수 있는 카드인지 검증
- 유효하면:
  - `topCard` 갱신, 공격 스택/문양 변경/턴 방향/턴 유지(K) 등의 효과 적용
  - 핸드가 0장이 되면 `winnerId` 설정 + 게임 종료 플래그 반환
  - 클라이언트에게 `card_play_response` 전송
  - 필요 시 `handleGameEnd()` 호출
- 실패하면:
  - `card_play_response` 에 `success: false` 와 에러 코드 전송

#### 5. 카드 뽑기 (Draw Card)

```ts
room.send("draw_card", {});
``>

**서버 처리**:
- `MafiaRoom.onMessage("draw_card")` → `handleDrawCard()` 호출
- 공격 스택이 있으면 스택 개수만큼, 없으면 1장 드로우
- 덱이 비면 `Deck.replenish()` 로 버린패에서 다시 채움
- `draw_card_response` 로 결과 전송 후 턴 넘김 + 파산(20장 초과) 체크

### 서버 → 클라이언트 메시지

#### 1. 상태 동기화 (State Sync)

Colyseus가 자동으로 상태 변경을 감지하고 클라이언트에 전송합니다.

```ts
room.onStateChange((state) => {
  console.log("게임 상태 업데이트:", state);
});
```

#### 2. 커스텀 메시지 (Broadcast)

```typescript
// 서버
this.broadcast("announcement", "플레이어가 카드를 냈습니다!");
```

```typescript
// 클라이언트
room.onMessage("announcement", (message) => {
  console.log("알림:", message);
});
```

### 통신 흐름도

```
┌─────────┐                    ┌─────────┐
│ Client  │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │  joinOrCreate("mafia_room")  │
     ├─────────────────────────────>│
     │                              │ onJoin()
     │                              │ GameState 업데이트
     │  State Sync (초기 상태)       │
     │<─────────────────────────────┤
     │                              │
     │  send("ready")               │
     │─────────────────────────────>│
     │                              │ onMessage("ready")
     │                              │ isReady = true
     │                              │ checkStartGame()
     │                              │
     │  State Sync (isReady 변경)    │
     │<─────────────────────────────┤
     │                              │
     │  send("card_play", {...})    │
     │─────────────────────────────>│
     │                              │ onMessage("card_play")
     │                              │ broadcast("announcement")
     │  Message: "announcement"     │
     │<─────────────────────────────┤
```

---

## 7. 게임 상태 관리

### Schema 기반 상태 동기화

Colyseus는 `@colyseus/schema`를 사용하여 효율적인 상태 동기화를 제공합니다.

**장점**:
- 변경된 데이터만 전송 (델타 압축)
- 타입 안전성
- 자동 동기화 (수동 브로드캐스트 불필요)

**데코레이터 사용**:
```typescript
export class Player extends Schema {
  @type([CardSchema]) hand = new ArraySchema<CardSchema>();
  @type("boolean") isReady: boolean = false;
}
```

### 게임 상태 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `status` | `string` | 게임 상태 (`"LOBBY"` | `"PLAYING"`) |
| `players` | `MapSchema<Player>` | 플레이어 목록 (키: sessionId) |

### 플레이어 상태 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `hand` | `ArraySchema<CardSchema>` | 보유한 카드 목록 |
| `isReady` | `boolean` | 준비 상태 |

---

## 8. API 엔드포인트

### HTTP 엔드포인트

| 메서드 | 경로 | 설명 | 응답 |
|--------|------|------|------|
| `GET` | `/` | 서버 상태 확인 | `"게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏"` |
| `GET` | `/colyseus` | Colyseus 모니터 대시보드 | HTML 대시보드 (방 목록, 플레이어 수 등) |

### WebSocket 엔드포인트

Colyseus는 WebSocket을 통해 통신합니다. 기본 포트는 **2567**입니다.

**연결 URL**: `ws://localhost:2567`

### 방 타입 (Room Type)

| 방 이름 | 클래스 | 설명 |
|---------|--------|------|
| `mafia_room` | `MafiaRoom` | 마피아 원카드 게임 방 |

**방 참여 방법**:
```typescript
const room = await client.joinOrCreate("mafia_room", { name: "플레이어1" });
```

---

## 9. 테스트 클라이언트

### `test-client.ts` 사용법

개발 및 디버깅을 위한 테스트 클라이언트가 제공됩니다.

**실행 방법**:
```bash
# TypeScript로 직접 실행
npx ts-node test-client.ts

# 또는 ts-node-dev 사용
ts-node-dev test-client.ts
```

**기능**:
- 서버에 연결
- 방 참여 (`joinOrCreate`)
- 준비 완료 메시지 전송
- 상태 변경 리스너 등록
- 플레이어 입장/카드 도착 이벤트 감지

**예시 출력**:
```
✅ 접속 성공! ID: xxxxx
📢 준비 완료 메시지 전송!
📦 서버 데이터 동기화 완료!
👤 플레이어 입장: yyyyy
🃏 카드 도착: [SPADE-A]
```

---

## 10. 게임 로직 상세

### 덱 및 카드 구성 (`entities/Deck.ts`)

**카드 구성 (공유 상수 기준)**:
- 일반 카드: SPADES/HEARTS/DIAMONDS/CLUBS × A~K
- 조커: 2장 (BLACK, COLOR)

`Deck` 엔티티는 다음 책임을 가집니다.
- `create()` : 전체 덱 생성
- `shuffle()` : Fisher-Yates 알고리즘으로 섞기
- `draw()` : 카드 한 장 뽑기
- `pushToDiscard(card)` : 버린패 더미에 카드 추가
- `replenish()` : 덱이 비었을 때 버린패로부터 다시 덱 구성

게임 중 남은 덱 개수(`deckCount`)는 `GameStateSchema`에 반영되어 클라이언트와 동기화됩니다.

### 카드 플레이 로직 (`engine/OneCardEngine.ts`)

**역할**: `MafiaRoom`에서 카드 플레이 요청을 위임받아 **룰 검증 + 효과 적용**을 수행하는 순수 엔진입니다.

주요 단계:

1. **카드 소유 검증**  
   - `player.hand` 내에 해당 `cardId` 가 존재하는지 확인
2. **공격 방어 검증**  
   - `attackStack > 0` 인 경우, 공격 카드(A,2,JOKER 등)만 허용  
   - 현재 공격 값보다 낮은 공격 카드는 거부 (`MUST_RESPOND_TO_ATTACK`)
3. **낼 수 있는 카드 검증**  
   - 현재 `topCard` + `selectedSuit` 기준  
   - 문양 일치 / 숫자 일치 / 조커 / 조커 위 카드 등 허용
4. **실행 단계**  
   - 기존 `topCard` 를 버린패로 이동  
   - 새 카드로 `topCard` 교체  
   - `applyCardEffects()` 로 공격 스택/문양 변경/턴 방향/턴 유지(K) 처리
5. **승리 조건**  
   - 해당 플레이어 핸드가 0장이 되면 `status = "ENDED"`, `winnerId` 설정

공격력 계산은 `getAttackValue(card)` 로 분리되어 있으며, A/2/조커(흑백/컬러)에 대해 각기 다른 공격 값을 갖습니다.

### 턴/타이머 및 AI (`TurnManager`, `BotManager`)

- **TurnManager**
  - 현재 턴 플레이어 ID, 턴 방향(`clockwise` / `counter-clockwise`) 관리
  - `nextTurn(skip?: boolean)` 으로 다음 턴 계산
  - 턴이 바뀔 때 `MafiaRoom` 의 `onTurnChange` 콜백을 통해
    - 스킬 쿨타임/사용 가능 횟수 업데이트 (`SkillManager.onTurnStart`)
    - 턴 타이머 시작 (`startTimer(10s, handleTurnTimeout)`)
    - 주술사 강제 스킬 처리

- **BotManager**
  - `createBot()` : 고유한 `bot_###` ID 와 `PlayerSchema` 를 생성
  - `isBot(sessionId)` : 봇 여부 확인
  - `decideAction()` : 단순한 행동 결정
    - 낼 수 있는 카드가 있으면 `type: 'play'`
    - 없으면 `type: 'draw'`
  - `MafiaRoom.processBotTurn()` 에서 이 결과를 받아 실제 `OneCardEngine.processCardPlay` 또는 `handleTurnTimeout` 호출  
    - K 카드를 내어 턴을 유지하는 경우 재귀적으로 다시 행동하도록 처리

---

## 11. 메시지 핸들러 (정리)

### 현재 구현된 주요 메시지

| 메시지 타입 | 방향 | 설명 |
|------------|------|------|
| `ready` | 클 → 서 | 플레이어 준비 상태 토글 (빠른 게임에서 자동 시작 조건 검사) |
| `start_game` | 클 → 서 | 커스텀 게임에서 호스트가 게임 시작 요청 (캐릭터 선택 단계 진입) |
| `select_character` | 클 → 서 | 플레이어가 캐릭터를 선택했을 때 호출, 모든 인원이 선택하면 `startGame()` |
| `card_play` | 클 ↔ 서 | 카드 내기 요청 및 `card_play_response` 응답 |
| `draw_card` | 클 ↔ 서 | 카드 뽑기 요청 및 `draw_card_response` 응답 (공격 스택/파산 처리 포함) |
| `use_skill` | 클 ↔ 서 | 캐릭터 스킬 사용, 결과에 따라 `skill_used` / `announcement` / `prophet_result` 등 송신 |
| `check_summon_target` | 클 ↔ 서 | 소환사 스킬 타겟 검증 및 `summoner_check_result` 응답 |
| `update_max_players` | 클 → 서 | 커스텀 게임에서 호스트가 방 최대 인원 변경 |
| `game_end` | 서 → 클 | 게임 종료 정보(랭크/잔여 카드 수 등) 브로드캐스트 |
| `announcement` | 서 → 클 | 정보/경고/에러 메시지 브로드캐스트 |
| `character_select` | 서 → 클 | 캐릭터 선택 화면으로 전환하라는 신호 |
| `shaman_force_skill` | 서 → 클 | 주술사 강제 스킬 사용을 요구하는 신호 |
| `skill_used` | 서 → 클 | 누가 어떤 스킬을 어떤 타겟에게 사용했는지 알림 |
| `prophet_result` | 서 → 클 | 예언자 스킬 결과(카드 목록, 대상 플레이어 정보) 전송 |

### 향후 확장 여지

- 추가 룰/카드(예: 특수 카드, 하우스 룰) 추가 시 `OneCardEngine` 내부에 효과 확장
- 더 정교한 AI 스킬 사용/타겟 선택 로직 (`BotManager`) 개선
- 재접속/재연결 시나리오 (중간에 끊긴 플레이어의 복귀) 지원

---

## 12. 보안 고려사항

### 서버 전용 데이터

다음 데이터는 클라이언트에 노출되지 않습니다:
- `deck`: 전체 덱 (남은 카드 수만 공개 가능)
- `discardPile`: 버려진 카드 더미 (맨 위 카드만 공개)

### 클라이언트 검증

**현재 상태**: 기본적인 메시지 수신만 구현됨

**향후 필요**:
- 카드 낼 수 있는지 검증 (`canPlayCard` 로직)
- 턴 순서 검증
- 스킬 사용 조건 검증
- 공격 카드 누적치 계산

---

## 13. 확장성 및 향후 개선

### 현재 구현 상태

✅ **완료된 기능**:
- 기본 방 생성/참여
- 플레이어 준비 상태 관리
- 덱 생성 및 카드 분배
- 상태 동기화

🚧 **진행 중/예정**:
- 카드 낼 수 있는지 검증 로직
- 턴 관리 시스템
- 카드 효과 처리 (공격, 방어, 스킵 등)
- 캐릭터 스킬 시스템
- 게임 종료 조건

### 성능 최적화

- **델타 압축**: Colyseus가 자동으로 처리
- **방 단위 격리**: 각 방은 독립적인 프로세스/스레드에서 실행 가능
- **수평 확장**: 여러 서버 인스턴스로 확장 가능 (Colyseus Matchmaker 사용)

---

## 14. 디버깅 및 모니터링

### Colyseus 모니터 대시보드

**접속 URL**: http://localhost:2567/colyseus

**기능**:
- 활성 방 목록
- 각 방의 플레이어 수
- 방 상태 정보
- 실시간 통계

### 로그 확인

서버 콘솔에서 다음 정보를 확인할 수 있습니다:
- 방 생성/삭제
- 플레이어 입장/퇴장
- 메시지 수신
- 게임 상태 변경

**예시 로그**:
```
마피아 원카드 방 생성!
xxxxx님이 게임에 참여했습니다!
xxxxx is ready: true
총 54장의 카드가 준비되었습니다.
xxxxx님에게 7장의 카드를 분배했습니다.
게임 시작! 초기 카드: SPADE-A
```

---

## 15. 참고 자료

- [Colyseus 공식 문서](https://docs.colyseus.io/)
- [@colyseus/schema 문서](https://docs.colyseus.io/colyseus/state/schema/)
- [Express 공식 문서](https://expressjs.com/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)

---

## 16. 문제 해결 (Troubleshooting)

### 포트 충돌

**문제**: `EADDRINUSE: address already in use :::2567`

**해결**:
```bash
# Windows
netstat -ano | findstr :2567
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:2567 | xargs kill
```

### 타입 오류

**문제**: `@colyseus/schema` 버전 불일치

**해결**: `package.json`의 `pnpm.overrides` 설정 확인
```json
"pnpm": {
  "overrides": {
    "@colyseus/schema": "1.0.46"
  }
}
```

### 연결 실패

**문제**: 클라이언트가 서버에 연결되지 않음

**확인 사항**:
1. 서버가 실행 중인지 확인
2. 포트 번호 확인 (기본: 2567)
3. 방 이름 확인 (`mafia_room`)
4. WebSocket URL 형식 확인 (`ws://localhost:2567`)

---

**문서 작성일**: 2025년 1월  
**최종 수정일**: 2026년 1월 (엔진/봇/스킬/로비 타이머 및 현재 로직 반영)  
**버전**: 2.0.0
