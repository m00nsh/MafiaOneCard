# 프론트엔드 기능 정의서 (Frontend Feature Specification)

이 문서는 `apps/frontend` 디렉토리의 전체 구조, 주요 컴포넌트의 기능, 유틸리티 로직, 그리고 핵심 페이지의 동작 방식을 상세히 기술합니다.

## 목차 (Table of Contents)

1. [프로젝트 구조](#1-프로젝트-구조)
2. [기술 스택](#2-기술-스택)
3. [파일 트리 구조](#3-파일-트리-구조)
4. [주요 파일별 기능 요약](#4-주요-파일별-기능-요약)
5. [컴포넌트 상세 분석](#5-컴포넌트-상세-분석)
6. [유틸리티 함수](#6-유틸리티-함수)
7. [화면 흐름 및 라우팅](#7-화면-흐름-및-라우팅)
8. [데이터 흐름 및 상태 관리](#8-데이터-흐름-및-상태-관리)

---

## 1. 프로젝트 구조

React 18과 TypeScript를 기반으로 한 단일 페이지 애플리케이션(SPA)입니다. UI 컴포넌트와 순수 게임 로직이 명확히 분리되어 있으며, 가로형 레이아웃(16:9)에 최적화된 게임 인터페이스를 제공합니다.

### 핵심 설계 원칙

- **컴포넌트 분리**: 화면(Screen) 컴포넌트와 재사용 가능한 UI 컴포넌트 분리
- **로직 분리**: 게임 규칙과 비즈니스 로직은 `utils/` 디렉토리에 순수 함수로 구현
- **타입 안정성**: TypeScript를 통한 엄격한 타입 체크
- **반응형 디자인**: `LandscapeLayout`을 통한 일관된 화면 크기 관리

---

## 2. 기술 스택

### 핵심 프레임워크 및 라이브러리

- **React 18.3.1**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite 6.3.5**: 빌드 도구 및 개발 서버
- **Tailwind CSS 4.1.12**: 유틸리티 기반 CSS 프레임워크

### 주요 의존성

- **Radix UI**: 접근성 있는 UI 컴포넌트 라이브러리 (다이얼로그, 드롭다운 등)
- **Lucide React**: 아이콘 라이브러리
- **Sonner**: 토스트 알림 라이브러리
- **React Hook Form**: 폼 관리
- **Recharts**: 차트 라이브러리

### 개발 도구

- **@vitejs/plugin-react**: React 지원
- **@tailwindcss/vite**: Tailwind CSS 통합

---

## 3. 파일 트리 구조

```
apps/frontend/
├── public/
│   └── card_deck.png              # 카드 스프라이트시트 이미지
├── src/
│   ├── app/
│   │   ├── App.tsx                # [핵심] 최상위 라우터 및 전역 상태 관리
│   │   ├── main.tsx               # 진입점 (React DOM 렌더링)
│   │   ├── components/            # 화면 및 UI 컴포넌트
│   │   │   ├── ui/                # 재사용 가능한 공통 UI 컴포넌트
│   │   │   │   ├── LandscapeLayout.tsx  # [핵심] 가로형 레이아웃 래퍼
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ... (47개 UI 컴포넌트)
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx  # 이미지 로딩 실패 시 폴백 처리
│   │   │   ├── MainScreen.tsx             # 메인 타이틀 화면
│   │   │   ├── GameModeScreen.tsx        # 게임 모드 선택 화면
│   │   │   ├── PlayerCountScreen.tsx     # 플레이어 수 선택 화면
│   │   │   ├── RoomScreen.tsx            # 대기방/로비 화면
│   │   │   ├── LoadingScreen.tsx         # 로딩 화면
│   │   │   ├── CharacterSelectScreen.tsx  # 캐릭터 선택 화면
│   │   │   ├── GameScreen.tsx            # [핵심] 인게임 화면
│   │   │   ├── PlayingCard.tsx           # [핵심] 카드 렌더링 컴포넌트
│   │   │   ├── PlayerInfo.tsx            # 플레이어 정보 표시 컴포넌트
│   │   │   └── CardSpriteTestScreen.tsx  # 개발용 카드 스프라이트 테스트 화면
│   │   └── utils/                 # 순수 게임 로직 및 유틸리티
│   │       ├── gameLogic.ts      # [핵심] 덱 생성, 셔플, 카드 효과 정의
│   │       └── nicknameGenerator.ts  # 랜덤 닉네임 생성기
│   └── styles/                    # 전역 스타일
│       ├── index.css              # 메인 스타일 진입점
│       ├── tailwind.css           # Tailwind CSS 설정
│       ├── theme.css              # 테마 변수
│       └── fonts.css              # 폰트 정의
├── index.html                     # HTML 진입점
├── package.json                   # 프로젝트 의존성 및 스크립트
├── tsconfig.json                  # TypeScript 설정
├── vite.config.ts                 # Vite 빌드 설정
├── postcss.config.mjs             # PostCSS 설정
└── README_ARCHITECTURE.md         # 이 문서
```

---

## 4. 주요 파일별 기능 요약

### 진입점 및 라우팅

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `src/main.tsx` | React 진입점 | React DOM 렌더링, 전역 CSS 임포트 |
| `src/app/App.tsx` | 최상위 라우터 | 화면 전환 로직, 전역 상태(`GameState`) 관리 |

### 화면 컴포넌트 (Screen Components)

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `MainScreen.tsx` | 메인 타이틀 화면 | 게임 시작 버튼, 개발용 스프라이트 테스트 버튼 |
| `GameModeScreen.tsx` | 게임 모드 선택 | 빠른 게임/맞춤 게임 선택, 닉네임 입력 |
| `PlayerCountScreen.tsx` | 플레이어 수 선택 | 2~5명 중 선택 (빠른 게임용) |
| `RoomScreen.tsx` | 대기방/로비 | 방 생성/참여, 플레이어 목록, 준비 상태 관리 |
| `LoadingScreen.tsx` | 로딩 화면 | 진행률 표시, 2초 후 자동 전환 |
| `CharacterSelectScreen.tsx` | 캐릭터 선택 | 8개 캐릭터 중 선택, 캐릭터 정보 표시 |
| `GameScreen.tsx` | **인게임 화면** | 게임 플레이, 카드 관리, 턴 진행, 스킬 시스템 |

### 핵심 UI 컴포넌트

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `PlayingCard.tsx` | 카드 렌더링 | 스프라이트시트 기반 카드 표시, 클릭 이벤트 처리 |
| `LandscapeLayout.tsx` | 레이아웃 래퍼 | 16:9 고정 해상도, 세로 모드 자동 회전, 스케일링 |
| `PlayerInfo.tsx` | 플레이어 정보 | 플레이어 이름, 캐릭터, 카드 수 표시 |

### 유틸리티 함수

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `gameLogic.ts` | 게임 로직 | 덱 생성, 셔플, 카드 효과 정의, 카드 유효성 검사 |
| `nicknameGenerator.ts` | 닉네임 생성 | 랜덤 닉네임 생성 (형용사 + 명사 조합) |

### 설정 파일

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `vite.config.ts` | 빌드 설정 | React 플러그인, 경로 별칭(`@` → `src`), Tailwind 통합 |
| `tsconfig.json` | TypeScript 설정 | 엄격 모드, 경로 매핑, JSX 설정 |
| `package.json` | 의존성 관리 | 프로젝트 메타데이터, 스크립트, 의존성 목록 |

---

## 5. 컴포넌트 상세 분석

### 5.1 App.tsx (최상위 라우터)

**역할**: 애플리케이션의 상태 관리 및 화면 라우팅을 담당합니다.

**주요 상태**:
```typescript
interface GameState {
  screen: Screen;                    // 현재 화면 ('main' | 'gameMode' | ...)
  gameMode: GameMode | null;         // 게임 모드 ('custom' | 'quick')
  playerCount: number;               // 플레이어 수 (2~5)
  selectedCharacters: string[];     // 선택된 캐릭터 ID 목록
  nickname: string;                  // 플레이어 닉네임
  isHost: boolean;                   // 호스트 여부
  roomCode: string;                  // 방 코드 (맞춤 게임용)
}
```

**화면 흐름**:
1. `main` → `gameMode` (게임 시작)
2. `gameMode` → `playerCount` (빠른 게임) 또는 `room` (맞춤 게임)
3. `playerCount` / `room` → `loading` → `characterSelect` → `game`

**특징**:
- 조건부 렌더링으로 화면 전환 구현 (라우터 라이브러리 미사용)
- 상태 업데이트 함수들을 props로 전달하여 하위 컴포넌트와 통신

---

### 5.2 GameScreen.tsx (인게임 화면)

**역할**: 게임 플레이의 핵심 화면으로, 카드 관리, 턴 진행, 상호작용을 담당합니다.

#### 상태 관리

| 상태 변수 | 타입 | 설명 |
|-----------|------|------|
| `myHand` | `Card[]` | 플레이어가 보유한 카드 리스트 |
| `sortMode` | `'none' \| 'suit' \| 'rank'` | 손패 정렬 방식 |
| `turnPlayerId` | `string` | 현재 턴을 진행 중인 플레이어 ID |
| `topCard` | `Card` | 버려진 카드 더미의 맨 위 카드 |
| `deckCount` | `number` | 남은 덱 카드 수 |
| `attackStack` | `number` | 누적된 공격 카드 수 |
| `direction` | `'clockwise' \| 'counter-clockwise'` | 턴 진행 방향 |
| `currentSkillCharge` | `number` | 스킬 게이지 (0~maxSkillCooldown) |

#### 핵심 기능

**1. 동적 카드 배치 (Dynamic Spacing)**
```typescript
const calculateOverlap = () => {
  const CARD_WIDTH = 80;
  const CONTAINER_MAX_WIDTH = 760;
  const STANDARD_OVERLAP = 40;
  
  // 카드가 많아지면 겹침 정도를 자동 조정
  // 최대 너비를 넘지 않도록 계산
}
```
- 손패의 장수에 따라 카드 간 겹침(`margin-left`)을 자동 계산
- 최대 760px 영역 내에 모든 카드가 표시되도록 조정

**2. 자동 정렬 (Auto-Sort)**
- `Sort: Suit` (문양순): 문양 → 숫자 순서
- `Sort: Rank` (숫자순): 숫자 → 문양 순서
- 카드를 뽑거나 낼 때 즉시 재정렬

**3. 카드 낼 수 있는 조건 (Playable Logic)**
```typescript
const isPlayable = isMyTurn && (
  card.suit === topCard.suit || 
  card.rank === topCard.rank || 
  card.isJoker
);
```

**4. 스킬 시스템**
- 쿨타임 게이지가 충전되면 버튼 활성화
- 테스트용: 비활성화 상태 클릭 시 게이지 충전

**5. 턴 방향 표시기**
- `TurnDirectionIndicator`: 시계 방향/반시계 방향을 화살표로 표시
- Q 카드 사용 시 방향 전환

**6. 상대방 플레이어 배치**
- 인원수에 따라 동적 배치:
  - 2명: 왼쪽 상단 1명
  - 3명: 왼쪽 상단, 오른쪽 상단 각 1명
  - 4명: 왼쪽 2명, 오른쪽 1명
  - 5명: 왼쪽 2명, 오른쪽 2명

---

### 5.3 PlayingCard.tsx (카드 렌더링)

**역할**: 스프라이트시트 기반으로 카드를 렌더링합니다.

**스프라이트시트 구조**:
- 이미지 크기: 2693 × 1420px
- 카드 크기: 205 × 280px
- 격자 구조: 5행(문양 4개 + 특수) × 13열(A~K)

**좌표 계산 로직**:
```typescript
const getSpriteCoords = () => {
  // 문양별 행: clubs(0), diamonds(1), hearts(2), spades(3)
  // 숫자별 열: A(0), 2(1), ..., K(12)
  // 뒷면: row=4, col=0
  // 조커: row=4, col=1(BW) 또는 col=2(Color)
}
```

**특징**:
- SVG `<image>` 태그로 스프라이트시트 일부만 표시
- `background-position` 대신 SVG 좌표로 정밀 제어
- 접근성: `aria-label`, 키보드 이벤트 지원

---

### 5.4 LandscapeLayout.tsx (레이아웃 래퍼)

**역할**: 모든 화면에 일관된 16:9 가로형 레이아웃을 제공합니다.

**고정 해상도**: 1280 × 720px (BASE_WIDTH × BASE_HEIGHT)

**주요 기능**:

1. **세로 모드 자동 회전**
   - 화면이 세로일 때 90도 회전하여 가로로 표시
   - `transform: rotate(90deg)` 사용

2. **스케일링**
   - 뷰포트 크기에 맞춰 자동 스케일 조정
   - `contain` 방식으로 비율 유지

3. **레터박싱**
   - 검은색 배경으로 여백 처리

**사용 예시**:
```tsx
<LandscapeLayout>
  <div>화면 내용</div>
</LandscapeLayout>
```

---

### 5.5 RoomScreen.tsx (대기방/로비)

**역할**: 맞춤 게임의 방 생성 및 참여 기능을 제공합니다.

**호스트 모드**:
- 방 코드 자동 생성 (6자리 대문자)
- 플레이어 슬롯 추가/제거 (2~5명)
- 모든 플레이어 준비 완료 시 게임 시작

**게스트 모드**:
- 초대 코드 입력 화면
- 방 참여 후 준비 상태 토글

**주요 기능**:
- 방 코드 공유 (Web Share API 또는 클립보드 복사)
- 플레이어 아바타 표시 (DiceBear API)
- 준비 상태 시각화

---

### 5.6 CharacterSelectScreen.tsx (캐릭터 선택)

**역할**: 게임 시작 전 플레이어가 사용할 캐릭터를 선택합니다.

**캐릭터 목록** (8개):
1. **잡상인**: 패 1장을 특정 플레이어에게 강제 전달 (쿨타임 3턴)
2. **탱커**: 공격 카드 누적치 50% 감쇄 (쿨타임 4턴)
3. **도둑**: 이전/다음 턴 플레이어 패에서 각 1장씩 가져오기 (쿨타임 3턴)
4. **예언자**: 이전 플레이어의 패 또는 가져간 카드 확인 (쿨타임 3턴)
5. **주술사**: 특정 플레이어를 지목해 스킬 강제 사용 (쿨타임 3턴)
6. **소환사**: 다른 플레이어의 스킬 뺏어서 사용 (1회 사용)
7. **암살자**: 특정 플레이어에게 카드 3장 부여 (쿨타임 5턴)
8. **광전사**: 자신 3장 먹고 상대 5장 먹이기 (2회 사용)

**UI 특징**:
- 한 번에 4개 캐릭터 표시
- 좌우 화살표로 탐색
- 선택 시 노란색 테두리 표시

---

### 5.7 기타 화면 컴포넌트

**MainScreen.tsx**:
- 게임 타이틀 표시
- "Game Start!" 버튼
- 개발용 스프라이트 테스트 버튼

**GameModeScreen.tsx**:
- 닉네임 입력 (랜덤 생성 또는 수동 입력)
- 게임 모드 선택: 방 만들기 / 방 참여하기 / 빠른 게임

**PlayerCountScreen.tsx**:
- 2~5명 중 플레이어 수 선택
- 큰 버튼으로 직관적 선택

**LoadingScreen.tsx**:
- 진행률 바 애니메이션
- 2초 후 자동 전환

**CardSpriteTestScreen.tsx**:
- 개발용 카드 스프라이트시트 검증 화면
- 모든 카드 종류를 그리드로 표시

---

## 6. 유틸리티 함수

### 6.1 gameLogic.ts

**타입 정의**:

```typescript
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
type Rank = 'A' | '2' | '3' | ... | 'K' | 'JOKER_BW' | 'JOKER_COLOR';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isJoker?: boolean;
}

interface Player {
  id: string;
  name: string;
  characterId: string;
  hand: Card[];
  skillCooldown: number;
  skillUsesLeft?: number;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  direction: 1 | -1;
  attackStack: number;
  selectedSuit: Suit | null;
}
```

**주요 함수**:

1. **`createDeck()`**: 표준 트럼프 카드 52장 + 조커 2장 생성
   - 각 문양별 A~K 생성
   - 조커: JOKER_BW (흑백), JOKER_COLOR (컬러)
   - 생성 후 자동 셔플

2. **`shuffle<T>(array: T[])`**: Fisher-Yates 알고리즘으로 배열 셔플
   - 원본 배열을 변경하지 않고 새 배열 반환

3. **`canPlayCard(card, topCard, selectedSuit)`**: 카드 낼 수 있는지 검사
   - 조커는 항상 가능
   - 문양 일치 또는 숫자 일치
   - 7 카드로 문양 변경 시 `selectedSuit` 기준

**카드 효과 정의** (`CARD_EFFECTS`):

| 카드 | 효과 | 설명 |
|------|------|------|
| A | 공격 | 다음 플레이어 3장 공격 |
| 2 | 공격 | 다음 플레이어 2장 공격 |
| 7 | 문양 변경 | 문양 변경 |
| J | 스킵 | 다음 플레이어 스킵 |
| Q | 방향 전환 | 진행 방향 반전 |
| K | 추가 낼 수 있음 | 한 장 더 내기 |
| JOKER_BW | 공격 | 다음 플레이어 5장 공격 |
| JOKER_COLOR | 공격 | 다음 플레이어 8장 공격 |

---

### 6.2 nicknameGenerator.ts

**기능**: 랜덤 닉네임 생성

**형식**: "형용사 + 명사" (예: "행복한 고등어")

**조합 수**: 15 × 15 = 225개

**형용사 목록** (15개):
- 행복한, 건강한, 귀여운, 용감한, 신속한, 차분한, 똑똑한, 즐거운, 따뜻한, 빛나는, 당당한, 씩씩한, 신비로운, 포근한, 화사한

**명사 목록** (15개):
- 고등어, 사자, 호랑이, 토끼, 거북이, 기린, 판다, 고래, 여우, 독수리, 다람쥐, 병아리, 강아지, 문어, 코알라

---

## 7. 화면 흐름 및 라우팅

### 전체 화면 흐름도

```
┌─────────────┐
│ MainScreen  │ (메인 타이틀)
└──────┬──────┘
       │ [Game Start!]
       ▼
┌─────────────┐
│GameModeScreen│ (게임 모드 선택)
└──────┬──────┘
       │
       ├─[빠른 게임]──► PlayerCountScreen ──► LoadingScreen ──► CharacterSelectScreen ──► GameScreen
       │
       ├─[방 만들기]──► RoomScreen (호스트) ──► LoadingScreen ──► CharacterSelectScreen ──► GameScreen
       │
       └─[방 참여하기]──► RoomScreen (게스트) ──► LoadingScreen ──► CharacterSelectScreen ──► GameScreen
```

### 화면별 전환 조건

| 화면 | 진입 조건 | 다음 화면 |
|------|----------|----------|
| `main` | 앱 시작 | `gameMode` |
| `gameMode` | 게임 모드 선택 | `playerCount` (빠른 게임) 또는 `room` (맞춤 게임) |
| `playerCount` | 플레이어 수 선택 | `loading` |
| `room` | 방 생성/참여 완료 | `loading` |
| `loading` | 2초 경과 | `characterSelect` |
| `characterSelect` | 캐릭터 선택 완료 | `game` |
| `game` | 게임 플레이 | (종료 시 `main`으로 복귀 예정) |

---

## 8. 데이터 흐름 및 상태 관리

### 현재 상태 관리 방식

**로컬 상태 (Local State)**:
- `App.tsx`의 `useState`로 전역 상태 관리
- 각 화면 컴포넌트는 props로 상태와 업데이트 함수를 받음

**향후 확장 계획**:
- Socket.IO를 통한 실시간 멀티플레이어 통신
- 서버에서 게임 상태 동기화
- `useContext` 또는 상태 관리 라이브러리 도입 검토

### 데이터 흐름 예시

**게임 시작 플로우**:

1. **MainScreen** → 사용자가 "Game Start!" 클릭
   - `onStart()` 호출 → `App.tsx`의 `navigateToScreen('gameMode')`

2. **GameModeScreen** → 사용자가 "빠른 게임" 선택
   - `onSelectMode('quick', false)` 호출
   - `setGameMode('quick')`, `setIsHost(false)`
   - `navigateToScreen('playerCount')`

3. **PlayerCountScreen** → 사용자가 "3명" 선택
   - `onSelectCount(3)` 호출
   - `setPlayerCount(3)`
   - `navigateToScreen('loading')`

4. **LoadingScreen** → 2초 후 자동 전환
   - `onComplete()` 호출
   - `navigateToScreen('characterSelect')`

5. **CharacterSelectScreen** → 사용자가 캐릭터 선택
   - `onComplete(['merchant'])` 호출
   - `setSelectedCharacters(['merchant'])`
   - `navigateToScreen('game')`

6. **GameScreen** → 게임 플레이
   - `playerCount={3}`, `selectedCharacters={['merchant']}` props 전달

### 상태 동기화 (향후)

현재는 클라이언트 내부 상태로만 동작하지만, 향후 Socket 통신을 통해:

1. **서버에서 게임 상태 수신**: 덱 분배, 턴 정보, 플레이어 액션
2. **클라이언트에서 서버로 전송**: 카드 내기, 스킬 사용, 턴 종료
3. **실시간 동기화**: 다른 플레이어의 액션을 즉시 반영

---

## 9. 스타일링 및 테마

### Tailwind CSS 사용

- 유틸리티 클래스 기반 스타일링
- 반응형 디자인: `sm:`, `md:` 등의 브레이크포인트 사용
- 커스텀 색상: `bg-[#00572b]` (게임 배경색)

### 주요 스타일 파일

- `styles/index.css`: 전역 스타일 진입점
- `styles/tailwind.css`: Tailwind 설정
- `styles/theme.css`: 테마 변수
- `styles/fonts.css`: 폰트 정의

### 레이아웃 특징

- 고정 해상도: 1280 × 720px (16:9)
- 세로 모드 자동 회전
- 터치 제스처 비활성화 (`touch-action: none`)

---

## 10. 개발 및 빌드

### 개발 서버 실행

```bash
pnpm dev
```

- Vite 개발 서버 시작
- HMR (Hot Module Replacement) 지원

### 프로덕션 빌드

```bash
pnpm build
```

- `dist/` 디렉토리에 빌드 결과물 생성
- 최적화된 번들 파일 생성

### 경로 별칭

- `@/` → `src/` 디렉토리
- 예: `@/app/components/GameScreen` → `src/app/components/GameScreen`

---

## 11. 향후 개선 사항

### 예정된 기능

1. **실시간 멀티플레이어**
   - Socket.IO 통신 연동
   - 서버와 게임 상태 동기화

2. **게임 로직 완성**
   - 카드 효과 구현 (공격, 방어, 스킵 등)
   - 스킬 시스템 완성
   - 승리 조건 처리

3. **UI/UX 개선**
   - 카드 드래그 앤 드롭
   - 애니메이션 효과 강화
   - 사운드 효과 추가

4. **성능 최적화**
   - 카드 렌더링 최적화
   - 메모이제이션 적용

---

## 12. 참고 자료

- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)

---

**문서 작성일**: 2025년 1월  
**최종 수정일**: 2025년 1월  
**버전**: 1.0.0
