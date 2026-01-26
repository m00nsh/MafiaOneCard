# 구현 작업 순서 (Implementation Order)

이 문서는 `SHARED_TYPES_MIGRATION.md`와 `INTEGRATION_ROADMAP.md`를 종합하여 실제 구현 작업의 순서를 제시합니다.

## 📊 현재 진행 상황

### ✅ 완료된 작업
- [x] `cardConverter.ts` 생성 (타입 변환 유틸리티)
- [x] `gameLogic.ts` 부분 수정 (shared 타입 import, UI 타입 export)
- [x] `@mafia/shared` 패키지 확장 (CARD_EFFECTS, CHARACTER_SKILLS, 메시지 타입, GAME_CONSTANTS)

### ⏳ 진행 중/대기 중
- [ ] `PlayingCard.tsx` 타입 마이그레이션
- [ ] `GameScreen.tsx` 타입 마이그레이션
- [ ] Colyseus 클라이언트 설치 및 설정
- [ ] 백엔드 연동

---

## 🎯 작업 순서 (우선순위별)

### **Step 1: 타입 마이그레이션 완료** (기반 작업)

백엔드 연동 전에 타입 시스템을 먼저 정리합니다.

#### 1.1 PlayingCard.tsx 수정
**목적**: UI 컴포넌트가 새로운 타입 시스템을 사용하도록 수정

**작업 내용**:
```typescript
// 변경 전
import { Card } from '@/app/utils/gameLogic';

// 변경 후
import { Card } from '@/app/utils/gameLogic'; // 이미 UICard로 export됨
// 또는 명시적으로
import { UICard } from '@/app/utils/cardConverter';
```

**검증 방법**:
- 컴파일 에러 없음
- 기존 Mock 데이터로 카드 렌더링 정상 작동

**예상 시간**: 10분

---

#### 1.2 GameScreen.tsx 타입 준비
**목적**: GameScreen에서 사용하는 Card 타입을 UICard로 통일

**작업 내용**:
```typescript
// 변경 전
import { Card, createDeck } from '@/app/utils/gameLogic';

// 변경 후
import { Card } from '@/app/utils/gameLogic'; // UICard
// createDeck은 서버에서 처리하므로 제거 또는 주석 처리
```

**검증 방법**:
- 컴파일 에러 없음
- Mock 데이터로 화면 정상 표시

**예상 시간**: 15분

---

### **Step 2: 환경 설정** (Phase 0)

타입 마이그레이션 완료 후 백엔드 연동 준비를 시작합니다.

#### 2.1 Colyseus 클라이언트 설치
**목적**: 백엔드와 통신하기 위한 클라이언트 라이브러리 설치

**작업 내용**:
```bash
cd apps/frontend
pnpm add colyseus.js
```

**검증 방법**:
- `package.json`에 `colyseus.js` 추가 확인
- 타입 정의 자동 설치 확인

**예상 시간**: 2분

---

#### 2.2 서버 URL 설정
**목적**: 개발/프로덕션 환경별 서버 URL 관리

**작업 내용**:
`apps/frontend/src/app/config/server.ts` 생성:
```typescript
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567';
export const ROOM_NAME = 'mafia_room';
```

또는 `.env` 파일 생성:
```
VITE_SERVER_URL=ws://localhost:2567
```

**검증 방법**:
- 설정 파일 import 정상 작동

**예상 시간**: 5분

---

#### 2.3 useColyseusRoom 훅 생성
**목적**: Colyseus 방 연결 로직을 재사용 가능한 훅으로 추상화

**작업 내용**:
`apps/frontend/src/app/hooks/useColyseusRoom.ts` 생성:
- 방 연결/해제 로직
- 상태 동기화 처리
- 메시지 송수신 래퍼
- 에러 핸들링
- 연결 상태 관리

**검증 방법**:
- 훅 기본 구조 컴파일 확인
- 타입 에러 없음

**예상 시간**: 1-2시간

---

### **Step 3: 연결 및 기본 통신** (Phase 1)

환경 설정 완료 후 실제 연결을 테스트합니다.

#### 3.1 GameScreen에 연결 로직 추가
**목적**: GameScreen에서 Colyseus 서버에 연결

**작업 내용**:
- `useColyseusRoom` 훅 사용
- `joinOrCreate("mafia_room")` 호출
- 연결 상태 UI 표시

**검증 방법**:
- 브라우저 콘솔에서 연결 로그 확인
- Colyseus 모니터에서 플레이어 입장 확인
- 네트워크 탭에서 WebSocket 연결 확인

**예상 시간**: 1-2시간

---

#### 3.2 연결 상태 UI 추가
**목적**: 사용자에게 연결 상태를 시각적으로 표시

**작업 내용**:
- 연결 중/연결됨/연결 끊김 상태 표시
- 디버깅용 연결 정보 표시 (개발 모드)

**검증 방법**:
- UI에서 연결 상태 확인 가능

**예상 시간**: 30분

---

### **Step 4: 상태 동기화** (Phase 2)

연결이 성공하면 서버 상태를 프론트엔드에 동기화합니다.

#### 4.1 RoomState 타입 정의
**목적**: 백엔드 GameState 스키마에 맞는 타입 정의

**작업 내용**:
- `@mafia/shared`의 `GameState`, `PlayerInfo` 타입 사용
- Colyseus Schema 타입과 매핑
- `CardSchema` 타입 정의 (백엔드와 동일)

**참고**: `@mafia/shared`에 이미 `GameState`, `PlayerInfo` 타입이 정의되어 있습니다.

**검증 방법**:
- 타입 에러 없음
- 자동완성 정상 작동

**예상 시간**: 30분

---

#### 4.2 상태 구독 및 변환
**목적**: 서버 상태를 로컬 상태로 변환하여 저장

**작업 내용**:
- `room.onStateChange()` 리스너 등록
- `state.players` → `opponents` 변환 (`PlayerInfo` 타입 사용)
- 내 플레이어 핸드 → `myHand` 변환 (cardToUI 사용)
- `state.status` 관리 (`RoomStatus` 타입 사용)
- `state.currentTurn`, `state.direction`, `state.attackStack` 등 동기화

**참고**: `@mafia/shared`의 `GameState` 타입을 참고하여 상태 구조를 파악합니다.

**검증 방법**:
- 서버 상태 변경 시 UI 업데이트 확인
- 콘솔 로그로 상태 동기화 확인

**예상 시간**: 2-3시간

---

### **Step 5: 게임 시작 및 카드 분배** (Phase 3)

상태 동기화가 완료되면 게임 시작 로직을 구현합니다.

#### 5.1 준비 상태 관리
**목적**: 플레이어 준비 상태를 서버와 동기화

**작업 내용**:
- `ready` 메시지 전송
- `state.players[myId].isReady` 상태 반영
- 모든 플레이어 준비 시 게임 시작 감지

**검증 방법**:
- 준비 버튼 클릭 시 서버로 메시지 전송 확인
- 다른 플레이어 준비 상태 동기화 확인

**예상 시간**: 1시간

---

#### 5.2 카드 분배 동기화
**목적**: 서버에서 분배된 카드를 UI에 표시

**작업 내용**:
- `state.status === "PLAYING"` 감지
- 서버 카드 → UI 카드 변환 (cardToUI)
- `myHand` 상태 업데이트
- 정렬 모드 유지

**검증 방법**:
- 게임 시작 후 내 핸드에 7장 표시 확인
- 다른 플레이어 카드 수 업데이트 확인

**예상 시간**: 1-2시간

---

#### 5.3 초기 카드 표시
**목적**: 게임 시작 시 바닥 카드 표시

**작업 내용**:
- 서버에서 `topCard` 브로드캐스트 또는 Schema 추가 필요
- 또는 커스텀 메시지로 초기 카드 수신

**주의**: 백엔드에 `discardPile` Schema 추가 또는 `topCard` 브로드캐스트 필요

**검증 방법**:
- 초기 카드(바닥 카드) 표시 확인

**예상 시간**: 1시간 (백엔드 수정 포함 시 추가 시간)

---

### **Step 6: 게임 액션 구현** (Phase 4-5)

기본 게임 흐름이 완성되면 사용자 액션을 구현합니다.

#### 6.1 카드 내기 구현
**목적**: 사용자가 카드를 내는 기능

**작업 내용**:
- `handlePlayCard()` 수정
- UI 카드 → 서버 카드 변환 (cardFromUI)
- `CardPlayMessage` 타입 사용 (`@mafia/shared`)
- `room.send("card_play", message)` 전송
- `CardPlayResponseMessage` 타입으로 서버 응답 처리

**검증 방법**:
- 카드 클릭 시 서버로 메시지 전송 확인
- 카드가 바닥에 표시되는지 확인
- 내 핸드에서 카드 제거 확인

**예상 시간**: 2-3시간

---

#### 6.2 카드 뽑기 구현
**목적**: 사용자가 덱에서 카드를 뽑는 기능

**작업 내용**:
- `handleDrawCard()` 수정
- `DrawCardMessage` 타입 사용 (`@mafia/shared`)
- `room.send("draw_card", {})` 전송
- `DrawCardResponseMessage` 타입으로 서버 응답 처리
- 서버에서 뽑은 카드를 `myHand`에 추가 (cardToUI 변환)
- 상태 동기화로 자동 반영

**검증 방법**:
- 카드 뽑기 버튼 클릭 시 서버로 메시지 전송 확인
- 내 핸드에 새 카드 추가 확인

**예상 시간**: 1-2시간

---

### **Step 7: 고급 기능** (Phase 6-7)

기본 게임 플레이가 완성되면 추가 기능을 구현합니다.

#### 7.1 턴 관리
**목적**: 턴 전환 및 턴 표시

**작업 내용**:
- 서버에서 `currentTurn` Schema 추가 필요
- `state.currentTurn === sessionId`로 내 턴 판단
- UI 업데이트 (버튼 활성화/비활성화)

**예상 시간**: 2-3시간

---

#### 7.2 공격 스택 및 방향 전환
**목적**: 게임 규칙 구현

**작업 내용**:
- `attackStack` Schema 추가
- `direction` Schema 추가
- Q 카드 사용 시 방향 전환
- 공격 카드 누적 처리

**예상 시간**: 3-4시간

---

### **Step 8: 에러 핸들링 및 최적화** (Phase 8)

모든 기능이 완성되면 안정성과 사용자 경험을 개선합니다.

#### 8.1 에러 처리
**목적**: 연결 실패, 메시지 전송 실패 등 처리

**작업 내용**:
- 연결 실패 시 사용자 알림
- 메시지 전송 실패 처리
- 서버 에러 응답 처리

**예상 시간**: 1-2시간

---

#### 8.2 로딩 상태 및 사용자 피드백
**목적**: 사용자 경험 개선

**작업 내용**:
- 연결 중 로딩 화면
- 게임 시작 대기 화면
- 토스트 알림 (Sonner 활용)

**예상 시간**: 1-2시간

---

## 📋 작업 체크리스트 요약

### 즉시 시작 가능 (타입 마이그레이션)
- [ ] **Step 1.1**: PlayingCard.tsx 타입 수정 (10분)
- [ ] **Step 1.2**: GameScreen.tsx 타입 준비 (15분)

### 환경 설정 (백엔드 연동 준비)
- [ ] **Step 2.1**: Colyseus 클라이언트 설치 (2분)
- [ ] **Step 2.2**: 서버 URL 설정 (5분)
- [ ] **Step 2.3**: useColyseusRoom 훅 생성 (1-2시간)

### 연결 및 통신
- [ ] **Step 3.1**: GameScreen 연결 로직 추가 (1-2시간)
- [ ] **Step 3.2**: 연결 상태 UI 추가 (30분)

### 상태 동기화
- [ ] **Step 4.1**: RoomState 타입 정의 (30분)
- [ ] **Step 4.2**: 상태 구독 및 변환 (2-3시간)

### 게임 기능
- [ ] **Step 5.1**: 준비 상태 관리 (1시간)
- [ ] **Step 5.2**: 카드 분배 동기화 (1-2시간)
- [ ] **Step 5.3**: 초기 카드 표시 (1시간)
- [ ] **Step 6.1**: 카드 내기 구현 (2-3시간)
- [ ] **Step 6.2**: 카드 뽑기 구현 (1-2시간)

### 고급 기능
- [ ] **Step 7.1**: 턴 관리 (2-3시간)
- [ ] **Step 7.2**: 공격 스택 및 방향 전환 (3-4시간)

### 최적화
- [ ] **Step 8.1**: 에러 처리 (1-2시간)
- [ ] **Step 8.2**: 로딩 상태 및 사용자 피드백 (1-2시간)

---

## ⏱️ 예상 총 작업 시간

| 단계 | 예상 시간 | 우선순위 |
|------|----------|----------|
| Step 1: 타입 마이그레이션 | 25분 | 🔴 필수 |
| Step 2: 환경 설정 | 1.5-2.5시간 | 🔴 필수 |
| Step 3: 연결 및 통신 | 1.5-2.5시간 | 🔴 필수 |
| Step 4: 상태 동기화 | 2.5-3.5시간 | 🔴 필수 |
| Step 5: 게임 시작 | 3-4시간 | 🔴 필수 |
| Step 6: 게임 액션 | 3-5시간 | 🔴 필수 |
| Step 7: 고급 기능 | 5-7시간 | 🟡 중요 |
| Step 8: 최적화 | 2-4시간 | 🟡 중요 |

**총 예상 시간**: 
- **기본 기능 (Step 1-6)**: 12-18시간
- **전체 기능**: 20-28시간

---

## 🚀 권장 작업 순서

### 첫 번째 세션 (2-3시간)
1. **Step 1.1**: PlayingCard.tsx 수정
2. **Step 1.2**: GameScreen.tsx 타입 준비
3. **Step 2.1**: Colyseus 클라이언트 설치
4. **Step 2.2**: 서버 URL 설정
5. **Step 2.3**: useColyseusRoom 훅 생성 (기본 구조)

### 두 번째 세션 (2-3시간)
1. **Step 2.3**: useColyseusRoom 훅 완성
2. **Step 3.1**: GameScreen 연결 로직 추가
3. **Step 3.2**: 연결 상태 UI 추가
4. **Step 4.1**: RoomState 타입 정의

### 세 번째 세션 (3-4시간)
1. **Step 4.2**: 상태 구독 및 변환
2. **Step 5.1**: 준비 상태 관리
3. **Step 5.2**: 카드 분배 동기화

### 네 번째 세션 (3-4시간)
1. **Step 5.3**: 초기 카드 표시
2. **Step 6.1**: 카드 내기 구현
3. **Step 6.2**: 카드 뽑기 구현

### 이후 세션
- Step 7-8: 고급 기능 및 최적화

---

## ⚠️ 주의사항

### 백엔드 수정 필요 사항

**참고**: `@mafia/shared` 패키지에 메시지 타입이 이미 정의되어 있습니다:
- 클라이언트 → 서버: `CardPlayMessage`, `DrawCardMessage`, `ReadyMessage`, `UseSkillMessage`
- 서버 → 클라이언트: `CardPlayResponseMessage`, `DrawCardResponseMessage`, `GameStartMessage` 등

다음 기능 구현 전에 백엔드 수정이 필요합니다:

1. **Step 5.3**: `topCard` Schema 추가 또는 `GameStartMessage`로 브로드캐스트
2. **Step 7.1**: `currentTurn` Schema 추가 (`GameState`에 이미 정의됨)
3. **Step 7.2**: `attackStack`, `direction` Schema 추가 (`GameState`에 이미 정의됨)
4. **Step 6.1-6.2**: 메시지 핸들러 구현 (`CardPlayMessage`, `DrawCardMessage` 처리)

### 의존성 순서
- Step 1은 Step 2-8의 기반이 됩니다 (먼저 완료 필요)
- Step 2는 Step 3-8의 기반이 됩니다
- Step 3은 Step 4-8의 기반이 됩니다
- 각 Step은 이전 Step 완료 후 진행하는 것을 권장합니다

---

**문서 작성일**: 2025년 1월  
**버전**: 1.0.0
