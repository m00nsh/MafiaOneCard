# 프론트엔드 기능 정의서 (Frontend Feature Specification)

이 문서는 `apps/frontend` 디렉토리의 **현재 코드 기준** 구조, 주요 컴포넌트의 역할, Colyseus 연동 방식, 그리고 화면/데이터 흐름을 정리한 문서입니다.

## 목차 (Table of Contents)

1. [프로젝트 구조](#1-프로젝트-구조)
2. [기술 스택](#2-기술-스택)
3. [파일 트리 구조](#3-파일-트리-구조)
4. [주요 파일별 기능 요약](#4-주요-파일별-기능-요약)
5. [컴포넌트 상세 분석](#5-컴포넌트-상세-분석)
6. [유틸리티 함수 및 훅](#6-유틸리티-함수-및-훅)
7. [화면 흐름 및 라우팅](#7-화면-흐름-및-라우팅)
8. [데이터 흐름 및 상태 관리](#8-데이터-흐름-및-상태-관리)

---

## 1. 프로젝트 구조

React 18과 TypeScript를 기반으로 한 단일 페이지 애플리케이션(SPA)입니다.  
Colyseus를 통한 실시간 멀티플레이 상태는 **`ColyseusContext`** 로 전역 공유되고,  
UI 컴포넌트와 순수 게임 로직은 각각 `components/`, `utils/` 디렉토리로 분리되어 있습니다.

### 핵심 설계 원칙

- **컴포넌트 분리**: 화면(Screen) 컴포넌트와 재사용 가능한 UI 컴포넌트 분리
- **로직 분리**: 게임 규칙과 비즈니스 로직은 `utils/` 디렉토리에 순수 함수로 구현
- **타입 안정성**: TypeScript + `@mafia/shared` 의 공유 타입을 통한 엄격한 타입 체크
- **레이아웃 일관성**: `LandscapeLayout`을 통한 16:9 고정 캔버스 + 뷰포트 스케일링
- **실시간 동기화**: Colyseus 상태를 Context 한 곳에서 관리, 모든 화면에서 공통 사용

---

## 2. 기술 스택

### 핵심 프레임워크 및 라이브러리

- **React 18.3.1**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite 6.3.5**: 빌드 도구 및 개발 서버
- **Tailwind CSS 4.1.12**: 유틸리티 기반 CSS 프레임워크

### 주요 의존성

- **Colyseus.js 0.16.0**: 실시간 멀티플레이어 게임 서버 클라이언트
- **@colyseus/schema 3.0.76**: Colyseus 상태 동기화 스키마
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

> 실제 디렉토리 구조(`apps/frontend/src/app`)를 기준으로 정리한 요약입니다.

```text
apps/frontend/
├── public/
│   ├── card_deck.png          # 카드 스프라이트시트
│   ├── Game_background.png    # 인게임 배경
│   ├── Lobby_background.png   # 로비/타이틀 배경
│   ├── Game_title_1.png       # 타이틀 로고
│   ├── sort_off.png           # 손패 정렬 버튼 (정렬 끔)
│   ├── sort_suit.png          # 손패 정렬 버튼 (문양 기준)
│   └── sort_rank.png          # 손패 정렬 버튼 (랭크 기준)
├── src/
│   ├── app/
│   │   ├── App.tsx            # [핵심] 최상위 라우터 및 전역 화면 상태 관리
│   │   ├── main.tsx           # 진입점 (React DOM 렌더링)
│   │   ├── components/        # 화면 및 UI 컴포넌트
│   │   │   ├── ui/            # 재사용 가능한 공통 UI 컴포넌트
│   │   │   ├── game/          # 인게임 레이아웃/조각 UI
│   │   │   ├── figma/
│   │   │   ├── MainScreen.tsx
│   │   │   ├── GameModeScreen.tsx
│   │   │   ├── PlayerCountScreen.tsx
│   │   │   ├── RoomScreen.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   ├── CharacterSelectScreen.tsx
│   │   │   ├── GameScreen.tsx
│   │   │   ├── PlayingCard.tsx
│   │   │   ├── PlayerInfo.tsx
│   │   │   └── CardSpriteTestScreen.tsx
│   │   ├── contexts/
│   │   │   └── ColyseusContext.tsx
│   │   ├── hooks/
│   │   │   ├── useToast.ts
│   │   │   ├── useCardSorting.ts
│   │   │   ├── useLoadingDots.ts
│   │   │   └── useColyseusRoom.ts          # (구버전 훅, 내부 로직은 Context로 이전됨)
│   │   ├── utils/
│   │   │   ├── gameLogic.ts
│   │   │   ├── cardConverter.ts
│   │   │   ├── cardPlayabilityUtils.ts
│   │   │   ├── opponentUtils.ts
│   │   │   ├── opponentTransformUtils.ts
│   │   │   ├── nicknameGenerator.ts
│   │   │   └── skillUtils.ts
│   │   └── config/
│   │       └── server.ts
│   └── styles/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── postcss.config.mjs
└── README_FRONTEND.md
```

---

## 4. 주요 파일별 기능 요약

### 진입점 및 라우팅

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `src/main.tsx` | React 진입점 | React DOM 렌더링, 전역 CSS 임포트, `ColyseusProvider` 포함 `App` 렌더링 |
| `src/app/App.tsx` | 최상위 라우터 | 화면 전환 로직, 전역 화면 상태(`GameState`) 관리, Colyseus 컨텍스트 래핑 |

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

### 컨텍스트 및 커스텀 훅

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `contexts/ColyseusContext.tsx` | 서버 연결 관리 | Colyseus 클라이언트/방/게임 상태 전역 관리, `useColyseus` 훅 제공 |
| `useToast.ts` | 토스트 알림 | 성공/에러/정보/경고 토스트 표시 |
| `useCardSorting.ts` | 카드 정렬 | 손패 정렬 로직 (문양순/숫자순/해제) |
| `useLoadingDots.ts` | 로딩 애니메이션 | 서버 연결 중 '.' 애니메이션 (1→2→3→1 순환) |

### 유틸리티 함수

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `gameLogic.ts` | 게임 로직 | 덱 생성, 셔플, 카드 효과 정의, 카드 유효성 검사 |
| `cardConverter.ts` | 타입 변환 | 백엔드 Card 타입 ↔ UI Card 타입 변환 |
| `cardPlayabilityUtils.ts` | 카드 판단 | 카드가 낼 수 있는지 판단 (공격 스택, 문양 변경 고려) |
| `opponentUtils.ts` | Mock 데이터 | Mock 상대방 플레이어 생성 |
| `opponentTransformUtils.ts` | 데이터 변환 | 서버 플레이어 정보를 UI 형식으로 변환 |
| `nicknameGenerator.ts` | 닉네임 생성 | 랜덤 닉네임 생성 (형용사 + 명사 조합) |

### 설정 파일

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `config/server.ts` | 서버 설정 | Colyseus 서버 URL, 방 이름, 디버그 모드 설정 |

### 빌드 설정 파일

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `vite.config.ts` | 빌드 설정 | React 플러그인, 경로 별칭(`@` → `src`), Tailwind 통합 |
| `tsconfig.json` | TypeScript 설정 | 엄격 모드, 경로 매핑, JSX 설정 |
| `package.json` | 의존성 관리 | 프로젝트 메타데이터, 스크립트, 의존성 목록 |

---

## 5. 컴포넌트 상세 분석

### 5.1 App.tsx (최상위 라우터)

**역할**: 애플리케이션의 **화면 상태 관리 및 라우팅**을 담당합니다.  
실제 네트워크/게임 상태는 `ColyseusContext`에서 관리되고, `App.tsx`는 그 위에 UI용 화면 스택을 구성합니다.

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
- `ColyseusProvider`로 전체 앱을 감싸, 어느 화면에서든 `useColyseus()` 사용 가능

---

### 5.2 GameScreen.tsx (인게임 화면)

**역할**: 게임 플레이의 핵심 화면으로, 카드 관리, 턴 진행, 스킬 사용 및 "원 카드!" 알림을 담당합니다.

**리팩토링/구조**:
- Colyseus 관련 로직은 `ColyseusContext`에서 가져와 사용 (`useColyseus`)
- 턴 방향, 타이머, 상대 영역, 손패 영역, 스킬 UI는 모두 `components/game/*`로 분리
- 손패 정렬/버튼 UI는 `useCardSorting` + `BottomArea` 조합으로 구성

#### 상태 관리

| 상태 변수 | 타입 | 설명 |
|-----------|------|------|
| `gameState` | `GameStateSchema` 기반 변환 객체 | `useColyseus`에서 제공하는 현재 게임 상태 |
| `myHand` | `Card[]` | 플레이어가 보유한 카드 리스트 (`gameState.myHand`) |
| `sortMode` | `'none' \| 'suit' \| 'rank'` | 손패 정렬 방식 (`useCardSorting`) |
| `topCard` | `Card` | 버려진 카드 더미의 맨 위 카드 (7 카드 문양 변경 반영) |
| `deckCount` | `number` | 남은 덱 카드 수 |
| `attackStack` | `number` | 누적된 공격 카드 수 |
| `direction` | `'clockwise' \| 'counter-clockwise'` | 턴 진행 방향 |
| `winnerId` | `string \| null` | 승자 ID |
| `showStatsDialog` | `boolean` | 게임 종료 다이얼로그 표시 여부 |
| `prevHandCountsRef` | `Ref<Map<string, number>>` | "원 카드!" 토스트 중복 방지를 위한 이전 카드 수 기록 |

#### 핵심 기능

**1. Colyseus 서버 연동**
- `useColyseus()` 훅을 통한 실시간 서버 연결
- `connect`/`disconnect`/`sendMessage`/`onMessage` 를 통해 Colyseus 방과 통신
- 게임 상태 자동 동기화 (카드, 턴, 공격 스택, 선택 문양, 스킬 쿨타임 등)
- 서버로 카드 내기/뽑기/스킬 사용/준비 상태 메시지 전송
- 서버 응답 처리 및 에러 핸들링

**2. 컴포넌트 분리 구조**
- `OpponentsArea`: 상대방 플레이어 영역
- `CenterArea`: 중앙 영역 (덱 & 바닥 카드)
- `BottomArea`: 하단 영역 (내 정보, 손패, 스킬, 정렬 버튼)
- `GameEndDialog`: 게임 종료 통계 다이얼로그
- `SuitSelectDialog`: 7 카드 문양 선택 다이얼로그
- `SkillDialog`: 캐릭터 스킬 사용 다이얼로그
- `TurnDirectionIndicator`, `TurnTimer`: 턴 진행/남은 시간 표시
- `LoadingOverlay`, `ConnectionStatusIndicator`: 연결/로딩 상태 표시

**3. 동적 카드 배치 (Dynamic Spacing)**
- `BottomArea` 컴포넌트 내부에서 처리
- 손패의 장수에 따라 카드 간 겹침(`margin-left`)을 자동 계산
- 최대 760px 영역 내에 모든 카드가 표시되도록 조정

**4. 자동 정렬 (Auto-Sort)**
- `useCardSorting` 훅으로 분리
- `Sort: Suit` (문양순): 문양 → 숫자 순서
- `Sort: Rank` (숫자순): 숫자 → 문양 순서
- 기본 정렬 모드: `suit`
- 정렬 상태는 `BottomArea` 좌측 하단의 이미지 버튼(`sort_off.png` / `sort_suit.png` / `sort_rank.png`)으로 표시

**5. 카드 낼 수 있는 조건 (Playable Logic)**
- `cardPlayabilityUtils.ts`로 분리
- 공격 스택 상황에 따른 공격 카드만 허용
- 7 카드 문양 변경 시 선택한 문양 기준 판단
- 조커 카드 처리 로직 포함

**6. 스킬 시스템**
- 스킬 쿨타임/사용 가능 횟수는 서버 상태(`gameState.myPlayer`)와 동기화
- `SkillButton` + `SkillDialog` 조합으로 캐릭터별 스킬 UI 제공

**7. 턴 방향 표시기**
- `TurnDirectionIndicator` 컴포넌트로 분리
- 시계 방향/반시계 방향을 화살표로 표시
- Q 카드 사용 시 방향 전환

**8. 상대방 플레이어 배치**
- `opponentTransformUtils.ts`로 분리
- 인원수에 따라 동적 배치:
  - 2명: 왼쪽 상단 1명
  - 3명: 왼쪽 상단, 오른쪽 상단 각 1명
  - 4명: 왼쪽 2명, 오른쪽 1명
  - 5명: 왼쪽 2명, 오른쪽 2명
- 시계 방향 턴 순서대로 배치

---

### 5.3 ColyseusContext.tsx (전역 네트워크 컨텍스트)

**역할**: Colyseus 클라이언트/방/상태를 전역으로 관리하고, 어떤 화면에서도 동일한 연결을 공유할 수 있게 합니다.

**주요 기능**:

- `connect(options)`:
  - 빠른 게임: 기존 방 `join` 실패 시 새 방 `create` 시도
  - 맞춤 게임: `roomCode`/`isHost`/`maxPlayers` 옵션을 통해 방 생성 또는 참여
  - 연결 성공 시 `room`, `sessionId`, `gameState` 설정
- `disconnect()`:
  - 방 `leave()`, 상태/리스너 정리, `status`를 `disconnected`로 재설정
- `gameState` 변환:
  - 서버 상태(`GameStateSchema`)를 UI에서 바로 사용 가능한 형태로 변환
  - `players`, `myPlayer`, `myHand`, `direction`, `attackStack`, `selectedSuit`, `deckCount`, `winnerId`, `timerEndTime`, `maxPlayers` 등 포함
- `sendMessage(type, payload)`:
  - 안전한 메시지 전송 래퍼 (연결 여부/에러 로그 처리)
- `onMessage(type, callback)`:
  - 타입별 리스너를 추가/제거하는 고수준 API
  - Colyseus의 `onMessage`는 타입당 한 번만 등록하고, 내부에서 여러 콜백으로 팬아웃

**사용 예시**:

```ts
const { status, gameState, connect, sendMessage, onMessage } = useColyseus();

useEffect(() => {
  void connect({ mode: 'quick', name: nickname });
}, [nickname, connect]);

useEffect(() => {
  const cleanup = onMessage('card_play_response', (response) => {
    console.log('카드 내기 결과:', response);
  });
  return cleanup;
}, [onMessage]);
```

---

### 5.4 PlayingCard.tsx (카드 렌더링)

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

### 5.5 LandscapeLayout.tsx (레이아웃 래퍼)

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

### 5.6 RoomScreen.tsx (대기방/로비)

**역할**: 맞춤 게임의 **방 생성/참여 및 준비 상태 관리**를 담당합니다.

**호스트 모드**:
- `ColyseusContext.connect({ mode: 'custom', isHost: true, roomCode, maxPlayers })` 로 방 생성
- 플레이어 슬롯 추가/제거 (2~5명, 서버 상태와 즉시 동기화)
- 모든 플레이어가 준비되었을 때만 `Start` 버튼 활성화
- 호스트가 방을 떠났을 때, 서버에서 자동으로 다른 플레이어에게 방장 권한 위임

**게스트 모드**:
- 초대 코드 입력 후 `connect({ mode: 'custom', isHost: false, roomCode })` 로 방 참여
- 준비 상태 토글 버튼 제공

**공통 기능**:
- 방 코드 공유 버튼: 클릭 시 방 코드 클립보드 복사
- 플레이어 목록/방장 여부/준비 상태를 실시간 표시
- `character_select` 메시지 수신 시 캐릭터 선택 화면으로 전환
- 방장이 나가고 다른 플레이어가 방장이 된 경우, UI에서도 자동으로 방장 UI(슬롯 조정, Start 버튼 등) 활성화

---

### 5.7 CharacterSelectScreen.tsx (캐릭터 선택)

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

**서버 연동**:
- 빠른 게임(`gameMode === 'quick'`): `LoadingScreen`에서 이미 방에 연결된 상태에서 진입  
  → 선택 완료 시 로컬 상태만 갱신하고 바로 `GameScreen`으로 이동
- 맞춤 게임(`gameMode === 'custom'`): 방에 연결된 상태에서 진입  
  → 선택 완료 시 `sendMessage('select_character', { characterId })` 로 서버에 선택 정보 전달

---

### 5.8 기타 화면 컴포넌트

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

## 6. 커스텀 훅 및 유틸리티 함수

### 6.1 useToast.ts (토스트 알림)

**역할**: Sonner 라이브러리를 사용한 토스트 알림을 제공합니다.

**주요 기능**:
- `showSuccess`: 성공 메시지 (녹색)
- `showError`: 에러 메시지 (빨간색)
- `showInfo`: 정보 메시지 (파란색)
- `showWarning`: 경고 메시지 (노란색)
- `show`: 기본 메시지

**사용 예시**:
```typescript
const { showError, showSuccess } = useToast();

showError('서버 연결에 실패했습니다', {
  description: '잠시 후 다시 시도해주세요.',
});
```

---

### 6.2 useCardSorting.ts (카드 정렬)

**역할**: 손패 정렬 기능을 제공합니다.

**주요 기능**:
- 문양순 정렬 (Suit → Rank)
- 숫자순 정렬 (Rank → Suit)
- 정렬 모드 토글

**반환 값**:
```typescript
{
  sortMode: 'none' | 'suit' | 'rank';
  sortedHand: Card[];
  handleToggleSort: () => void;
}
```

---

### 6.3 useLoadingDots.ts (로딩 애니메이션)

**역할**: 서버 연결 중 로딩 애니메이션을 제공합니다.

**주요 기능**:
- 0.333초마다 '.' 개수가 1개 → 2개 → 3개 → 1개로 순환
- 연결 상태에 따라 자동 초기화

---

### 6.4 gameLogic.ts

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

### 6.5 cardConverter.ts (타입 변환)

**역할**: 백엔드/서버의 Card 타입과 프론트엔드 UI의 Card 타입을 변환합니다.

**타입 정의**:
```typescript
// 백엔드 타입 (서버/공유 패키지)
type CardSuit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB' | 'JOKER';
type CardRank = 'A' | '2' | ... | 'K' | 'BLACK' | 'COLOR';

// 프론트엔드 UI 타입
type UISuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
type UIRank = 'A' | '2' | ... | 'K' | 'JOKER_BW' | 'JOKER_COLOR';
```

**주요 함수**:
- `suitToUI(suit: CardSuit): UISuit`: 서버 문양 → UI 문양
- `rankToUI(rank: CardRank): UIRank`: 서버 숫자 → UI 숫자
- `cardToUI(card: Card): UICard`: 서버 카드 → UI 카드
- `cardFromUI(uiCard: UICard): Card`: UI 카드 → 서버 카드
- `cardsToUI(cards: Card[]): UICard[]`: 카드 배열 변환
- `cardsFromUI(uiCards: UICard[]): Card[]`: 카드 배열 변환

---

### 6.6 cardPlayabilityUtils.ts (카드 낼 수 있는지 판단)

**역할**: 카드가 현재 상황에서 낼 수 있는지 판단합니다.

**주요 로직**:
- 공격 스택이 있을 때: 공격 카드(A, 2, 조커)만 허용
- 공격 스택이 없을 때: 일반 규칙 (문양/숫자 일치 또는 조커)
- 7 카드 문양 변경 시: 선택한 문양 기준 판단
- 조커 카드 특수 규칙 처리

**함수 시그니처**:
```typescript
function isCardPlayable(
  card: Card,
  topCard: Card,
  attackStack: number,
  selectedSuit: CardSuit | null,
  isMyTurn: boolean,
  isPlaying: boolean
): boolean
```

---

### 6.7 opponentUtils.ts & opponentTransformUtils.ts

**opponentUtils.ts**: Mock 상대방 플레이어 생성
- 플레이어 수에 따른 위치 배치 로직
- Mock 데이터 생성

**opponentTransformUtils.ts**: 서버 플레이어 정보 변환
- 서버의 `Map<string, PlayerInfo>`를 UI의 `OpponentPlayer[]`로 변환
- 시계 방향 턴 순서대로 배치
- 캐릭터 이름 매핑

---

### 6.8 nicknameGenerator.ts

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

**1. 로컬 상태 (Local State)**
- `App.tsx`의 `useState`로 전역 상태 관리
- 각 화면 컴포넌트는 props로 상태와 업데이트 함수를 받음

**2. 서버 상태 동기화 (Colyseus)**
- `useColyseusRoom` 훅을 통한 실시간 서버 연결
- `GameStateSchema`를 통한 게임 상태 자동 동기화
- 서버에서 변경된 상태가 자동으로 클라이언트에 반영

**상태 동기화 흐름**:
```
서버 (MafiaRoom) 
  → GameStateSchema 업데이트
  → Colyseus 자동 동기화
  → 클라이언트 (useColyseusRoom)
  → gameState 업데이트
  → React 리렌더링
```

**메시지 통신**:
- 클라이언트 → 서버: `sendMessage(type, data)`
  - 예: `sendMessage('card_play', { cardId, suit, rank })`
- 서버 → 클라이언트: `onMessage(type, callback)`
  - 예: `onMessage('card_play_response', (response) => {...})`

### 데이터 흐름 예시

**게임 시작 플로우 (빠른 게임)**:

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

4. **LoadingScreen**  
   - `useColyseus().connect({ mode: 'quick', name, playerCount })` 로 매칭 서버 연결  
   - 2초 후 `onComplete()` 호출 → `navigateToScreen('characterSelect')`

5. **CharacterSelectScreen** → 사용자가 캐릭터 선택  
   - `onComplete(['merchant'])` 호출  
   - `setSelectedCharacters(['merchant'])`  
   - `navigateToScreen('game')`

6. **GameScreen** → 게임 플레이  
   - `useColyseus()` 를 통해 이미 연결된 방 상태를 그대로 사용

### 게임 상태 동기화 (현재 구현)

**서버에서 수신하는 상태**:
- 플레이어 목록 및 정보 (닉네임, 캐릭터, 손패 수)
- 현재 턴 플레이어
- 게임 진행 방향 (시계/반시계)
- 공격 스택
- 바닥 카드 (topCard)
- 선택된 문양 (7 카드 사용 시)
- 덱 카드 수
- 게임 상태 (LOBBY, PLAYING, ENDED)
- 승자 ID

**클라이언트에서 서버로 전송**:
- `card_play`: 카드 내기
- `draw_card`: 카드 뽑기
- `ready`: 준비 상태 토글
- `start_game`: 방장이 수동으로 게임 시작 (맞춤 게임)
- `select_character`: 캐릭터 선택 결과 전송 (맞춤 게임)
- `use_skill`: 캐릭터 스킬 사용

**실시간 동기화**:
- 다른 플레이어의 액션이 즉시 반영됨
- 턴 전환, 공격 스택 변경, 스킬 사용, 원 카드/파산 등 상태가 자동으로 UI에 업데이트

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

## 11. 리팩토링 및 아키텍처 개선

### GameScreen.tsx 리팩토링 (완료)

**목적**: 989줄의 거대한 컴포넌트를 여러 작은 컴포넌트로 분리하여 유지보수성 향상

**분리된 컴포넌트**:
- `components/game/` 폴더에 11개의 컴포넌트 생성
- 각 컴포넌트가 단일 책임 원칙을 따름
- 재사용 가능한 구조로 설계

**분리된 로직**:
- `hooks/` 폴더에 4개의 커스텀 훅 생성
- `utils/` 폴더에 3개의 유틸리티 함수 추가

**결과**:
- `GameScreen.tsx`: 989줄 → 약 316줄 (약 68% 감소)
- 코드 가독성 및 유지보수성 향상
- 각 컴포넌트의 독립적 테스트 가능

---

## 12. 향후 개선 사항

### 예정된 기능

1. **게임 로직 완성**
   - 모든 카드 효과 구현 (공격, 방어, 스킵 등)
   - 스킬 시스템 완성
   - 승리 조건 처리
   - 파산(Burst) 처리

2. **AI 봇 시스템**
   - 빠른 게임에서 인원 부족 시 AI 봇 자동 참여
   - 단순한 행동 로직 (랜덤 카드 선택)

3. **UI/UX 개선**
   - 카드 드래그 앤 드롭
   - 애니메이션 효과 강화
   - 사운드 효과 추가
   - 게임 종료 통계 화면 개선

4. **성능 최적화**
   - 카드 렌더링 최적화
   - 메모이제이션 적용
   - 불필요한 리렌더링 방지

5. **에러 처리 강화**
   - 네트워크 오류 복구 로직
   - 재연결 메커니즘
   - 사용자 친화적 에러 메시지

---

## 13. 참고 자료

- [React 공식 문서](https://react.dev/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)

---

**문서 작성일**: 2025년 1월  
**최종 수정일**: 2026년 1월 (ColyseusContext/정렬 버튼/인게임 구조 반영)  
**버전**: 2.1.0

---

## 변경 이력

### v2.0.0 (2025년 1월)
- GameScreen.tsx 리팩토링 (989줄 → 316줄)
- `components/game/` 폴더에 11개 컴포넌트 분리
- `hooks/` 폴더에 4개 커스텀 훅 추가
- `utils/` 폴더에 3개 유틸리티 함수 추가
- Colyseus 서버 연동 완료
- 실시간 게임 상태 동기화 구현

### v1.0.0 (2025년 1월)
- 초기 문서 작성
