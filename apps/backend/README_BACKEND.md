# 백엔드 기술 문서 (Backend Technical Documentation)

이 문서는 `apps/backend` 디렉토리의 구조, 기술 스택, 게임 서버 로직, 그리고 소켓 통신 방식을 상세히 기술합니다.

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

```
apps/backend/
├── src/
│   ├── index.ts              # 서버 진입점 (Express + Colyseus 설정)
│   └── rooms/
│       └── MafiaRoom.ts      # 게임 방 로직 (핵심 게임 상태 관리)
├── test-client.ts            # 개발용 테스트 클라이언트
├── package.json              # 의존성 및 스크립트 정의
├── tsconfig.json             # TypeScript 설정
└── dist/                     # 빌드 출력 디렉토리 (생성됨)
```

---

## 2. 기술 스택

### 핵심 프레임워크 및 라이브러리

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Colyseus** | 0.16.0 | 실시간 멀티플레이어 게임 서버 프레임워크 |
| **@colyseus/schema** | 1.0.46 | 게임 상태 동기화를 위한 스키마 정의 |
| **@colyseus/core** | ^0.16.24 | Colyseus 핵심 기능 |
| **@colyseus/ws-transport** | 0.16.0 | WebSocket 전송 계층 |
| **@colyseus/monitor** | ~0.16.7 | 서버 모니터링 대시보드 |
| **Express** | ^5.2.1 | HTTP 서버 및 미들웨어 |
| **@mafia/shared** | workspace:* | 공통 타입 정의 (Card, CardSuit, CardRank) |

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

**역할**: Express 서버와 Colyseus 게임 서버를 초기화하고 설정합니다.

**주요 기능**:
- Express 앱 생성 및 HTTP 서버 설정
- Colyseus 서버 인스턴스 생성
- 게임 방 타입 등록 (`mafia_room`)
- Colyseus 모니터 대시보드 설정 (`/colyseus` 경로)

**코드 구조**:
```typescript
const app = express();
const server = createServer(app);
const gameServer = new Server({ server });

// 방 타입 등록
gameServer.define("mafia_room", MafiaRoom);

// 모니터 대시보드
app.use("/colyseus", monitor());
```

**접근 가능한 엔드포인트**:
- `GET /`: 서버 상태 확인
- `GET /colyseus`: Colyseus 모니터 대시보드 (방 목록, 플레이어 수 등)

---

### `src/rooms/MafiaRoom.ts` (게임 방 로직)

**역할**: 게임 방의 생명주기와 게임 상태를 관리합니다.

**주요 클래스**:

1. **`CardSchema`**: 카드 데이터 스키마
   - Colyseus Schema를 상속하여 자동 동기화
   - `id`, `suit`, `rank` 필드

2. **`Player`**: 플레이어 스키마
   - `hand`: 플레이어가 보유한 카드 목록 (ArraySchema)
   - `isReady`: 준비 상태 플래그

3. **`GameState`**: 게임 전체 상태
   - `status`: 게임 상태 (`"LOBBY"` | `"PLAYING"`)
   - `players`: 플레이어 맵 (MapSchema)

4. **`MafiaRoom`**: 게임 방 클래스
   - 방 생성/삭제, 플레이어 입장/퇴장 처리
   - 게임 로직 (덱 생성, 카드 분배, 게임 시작)
   - 클라이언트 메시지 처리

---

## 5. 게임 방(Room) 구조

### 방 생명주기 (Room Lifecycle)

```
1. onCreate()     → 방 생성 시 한 번 실행
2. onJoin()      → 플레이어 입장 시 실행
3. onLeave()     → 플레이어 퇴장 시 실행
4. onDispose()   → 방 삭제 시 실행 (현재 미구현)
```

### 게임 상태 전환

```
LOBBY → (모든 플레이어 준비) → PLAYING
```

**전환 조건**:
- 최소 2명 이상의 플레이어
- 모든 플레이어가 `isReady = true`
- 현재 상태가 `LOBBY`

### 서버 전용 데이터 (Schema 외부)

보안을 위해 클라이언트에 노출되지 않는 데이터:

```typescript
private deck: Card[] = [];        // 전체 덱
private discardPile: Card[] = []; // 버려진 카드 더미
```

이 데이터는 서버 메모리에서만 관리되며, 클라이언트는 자신의 핸드만 볼 수 있습니다.

---

## 6. 소켓 통신 흐름

### 클라이언트 → 서버 메시지

#### 1. 방 참여 (Join Room)

```typescript
// 클라이언트
const room = await client.joinOrCreate("mafia_room", { name: "플레이어1" });
```

**서버 처리**:
- `onJoin(client, options)` 호출
- `GameState.players`에 새 플레이어 추가
- 클라이언트에게 초기 상태 전송

#### 2. 준비 완료 (Ready)

```typescript
// 클라이언트
room.send("ready");
```

**서버 처리**:
- `onMessage("ready", ...)` 핸들러 실행
- 해당 플레이어의 `isReady` 상태 토글
- `checkStartGame()` 호출하여 게임 시작 조건 확인

#### 3. 카드 내기 (Card Play)

```typescript
// 클라이언트
room.send("card_play", { cardId: "SPADE-A" });
```

**서버 처리**:
- `onMessage("card_play", ...)` 핸들러 실행
- 카드 유효성 검사 (향후 구현)
- 모든 플레이어에게 알림 방송

### 서버 → 클라이언트 메시지

#### 1. 상태 동기화 (State Sync)

Colyseus가 자동으로 상태 변경을 감지하고 클라이언트에 전송합니다.

```typescript
// 클라이언트
room.onStateChange((state) => {
  // 상태 변경 시 자동 호출
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

### 덱 생성 (`createDeck()`)

**카드 구성**:
- 일반 카드: 52장 (SPADE, HEART, DIAMOND, CLUB × A~K)
- 조커: 2장 (JOKER-BLACK, JOKER-COLOR)
- **총 54장**

**카드 ID 형식**:
- 일반 카드: `{SUIT}-{RANK}` (예: `"SPADE-A"`, `"HEART-K"`)
- 조커: `"JOKER-BLACK"`, `"JOKER-COLOR"`

### 카드 섞기 (`shuffleDeck()`)

**알고리즘**: Fisher-Yates Shuffle
- 배열을 무작위로 섞는 표준 알고리즘
- 시간 복잡도: O(n)

### 카드 분배 (`distributeCards()`)

**규칙**:
- 각 플레이어에게 **7장씩** 분배
- 플레이어 순서대로 순차 분배
- 분배된 카드는 `Player.hand`에 추가

**예시**:
```
플레이어 A: 7장
플레이어 B: 7장
플레이어 C: 7장
...
남은 덱: 54 - (플레이어 수 × 7)장
```

### 게임 시작 (`prepareGame()`)

**실행 순서**:
1. 덱 생성 (`createDeck()`)
2. 덱 섞기 (`shuffleDeck()`)
3. 카드 분배 (`distributeCards()`)
4. 초기 카드 1장을 버려진 카드 더미에 배치

**초기 카드**:
- 덱에서 1장을 뽑아 `discardPile`에 추가
- 이 카드가 게임 시작 시 첫 번째 "낼 수 있는 카드" 기준이 됩니다.

---

## 11. 메시지 핸들러

### 현재 구현된 메시지

| 메시지 타입 | 클라이언트 → 서버 | 설명 |
|------------|------------------|------|
| `ready` | ✅ | 플레이어 준비 상태 토글 |
| `card_play` | ✅ | 카드 내기 (현재는 알림만 방송) |

### 향후 구현 예정

- `draw_card`: 덱에서 카드 뽑기
- `select_suit`: 문양 선택 (7 카드 사용 시)
- `use_skill`: 캐릭터 스킬 사용
- `end_turn`: 턴 종료

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
**최종 수정일**: 2025년 1월  
**버전**: 1.0.0
