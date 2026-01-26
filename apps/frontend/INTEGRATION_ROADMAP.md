# 프론트엔드-백엔드 연동 로드맵 (Integration Roadmap)

이 문서는 프론트엔드(`GameScreen.tsx`)와 백엔드(`MafiaRoom.ts`)를 연동하기 위한 단계별 실행 계획입니다.

## 📋 현재 상황 분석

### 발견된 이슈

1. **타입 불일치**:
   - 프론트엔드: `'hearts' | 'diamonds' | 'clubs' | 'spades'` (소문자)
   - 백엔드/shared: `'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB'` (대문자)
   - 조커: 프론트엔드 `'JOKER_BW'/'JOKER_COLOR'` vs 백엔드 `'BLACK'/'COLOR'`
   - **해결**: `cardConverter.ts`에서 변환 함수 제공

2. **의존성 누락**:
   - 프론트엔드에 `colyseus.js` 클라이언트 라이브러리 미설치

3. **상태 구조 차이**:
   - 프론트엔드: 로컬 상태 (`useState`)
   - 백엔드: Colyseus Schema 기반 상태 동기화
   - **참고**: `@mafia/shared`에 `GameState`, `PlayerInfo` 타입이 정의되어 있음

4. **타입 및 상수 공유**:
   - ✅ `@mafia/shared`에 `CARD_EFFECTS`, `CHARACTER_SKILLS`, `GAME_CONSTANTS` 정의됨
   - ✅ 메시지 타입 (`CardPlayMessage`, `DrawCardMessage` 등) 정의됨

---

## 🗺️ 단계별 실행 계획

### **Phase 0: 사전 준비 및 환경 설정** ⚙️

#### 0.1 의존성 설치
- [ ] `colyseus.js` 클라이언트 라이브러리 설치
  ```bash
  cd apps/frontend
  pnpm add colyseus.js
  ```

#### 0.2 타입 변환 유틸리티 생성
- [ ] `apps/frontend/src/app/utils/cardConverter.ts` 생성
  - 백엔드 형식(`SPADE`, `BLACK`) ↔ 프론트엔드 형식(`spades`, `JOKER_BW`) 변환 함수
  - 양방향 변환 지원

#### 0.3 Colyseus 클라이언트 훅 생성
- [ ] `apps/frontend/src/app/hooks/useColyseusRoom.ts` 생성
  - 방 연결/해제 로직
  - 상태 동기화 처리
  - 메시지 송수신 래퍼
  - 에러 핸들링

**예상 작업 시간**: 1-2시간  
**검증 방법**: 타입 변환 함수 단위 테스트, 훅 기본 연결 테스트

---

### **Phase 1: 연결 확인 및 기본 통신** 🔌

#### 1.1 서버 연결 설정
- [ ] 환경 변수 또는 설정 파일에 서버 URL 정의
  - 개발: `ws://localhost:2567`
  - 프로덕션: 환경 변수로 관리

#### 1.2 방 입장 로직 구현
- [ ] `GameScreen.tsx`에서 `useColyseusRoom` 훅 사용
- [ ] `joinOrCreate("mafia_room")` 호출
- [ ] 연결 성공/실패 상태 관리
- [ ] 로딩 상태 UI 추가

#### 1.3 연결 상태 표시
- [ ] 연결 중/연결됨/연결 끊김 상태 표시
- [ ] 디버깅용 연결 정보 표시 (sessionId, 방 ID 등)

**예상 작업 시간**: 2-3시간  
**검증 방법**: 
- 브라우저 콘솔에서 연결 로그 확인
- Colyseus 모니터(`http://localhost:2567/colyseus`)에서 플레이어 입장 확인
- 네트워크 탭에서 WebSocket 연결 확인

**디버깅 계획**:
```typescript
// 콘솔 로그 예시
console.log('[Colyseus] 연결 시도...');
console.log('[Colyseus] 연결 성공:', room.sessionId);
console.log('[Colyseus] 상태 동기화:', state);
```

---

### **Phase 2: 상태 동기화 - 기본 구조** 🔄

#### 2.1 RoomState 타입 정의
- [ ] 백엔드 `GameState` 스키마에 맞는 타입 정의
- [ ] `Player` 스키마 타입 정의
- [ ] `CardSchema` 타입 정의

#### 2.2 상태 구독 및 로컬 상태 매핑
- [ ] `room.onStateChange()` 리스너 등록
- [ ] 백엔드 `state.players` → 프론트엔드 `opponents` 변환
- [ ] 내 플레이어(`state.players.get(sessionId)`) → `myHand` 변환
- [ ] `state.status` → 게임 상태 관리

#### 2.3 카드 데이터 변환
- [ ] `CardSchema` → 프론트엔드 `Card` 형식 변환
- [ ] Suit/Rank 형식 변환 (대문자 ↔ 소문자)
- [ ] 조커 타입 변환 (`BLACK` ↔ `JOKER_BW`)

**예상 작업 시간**: 3-4시간  
**검증 방법**:
- 서버에서 카드 분배 후 프론트엔드에 표시되는지 확인
- 다른 플레이어 입장 시 상대방 목록 업데이트 확인
- 콘솔에서 상태 변경 로그 확인

**디버깅 계획**:
```typescript
// 상태 변경 감지 로그
room.onStateChange((state) => {
  console.log('[State] 전체 상태:', state);
  console.log('[State] 플레이어 수:', state.players.size);
  console.log('[State] 내 핸드:', myPlayer?.hand.length);
});
```

---

### **Phase 3: 게임 시작 및 카드 분배** 🎮

#### 3.1 준비 상태 관리
- [ ] `ready` 메시지 전송 로직
- [ ] `state.players[myId].isReady` 상태 반영
- [ ] 모든 플레이어 준비 시 게임 시작 감지

#### 3.2 카드 분배 동기화
- [ ] `state.status === "PLAYING"` 감지
- [ ] 서버에서 분배된 카드를 `myHand`에 반영
- [ ] 카드 변환 (`CardSchema` → `Card`) 적용
- [ ] 정렬 모드 유지 (기존 `sortMode` 상태 유지)

#### 3.3 초기 카드 표시
- [ ] 서버의 `discardPile[0]` (초기 카드) 표시
  - **주의**: 현재 백엔드에 `discardPile`이 Schema에 없음
  - **해결 방안**: 서버에서 `topCard` 브로드캐스트 또는 Schema 추가 필요

**예상 작업 시간**: 2-3시간  
**검증 방법**:
- 게임 시작 후 내 핸드에 7장 표시 확인
- 다른 플레이어 카드 수 업데이트 확인
- 초기 카드(바닥 카드) 표시 확인

**디버깅 계획**:
```typescript
// 카드 분배 로그
console.log('[Game] 게임 시작 감지');
console.log('[Game] 내 핸드 카드:', myHand.map(c => `${c.suit}-${c.rank}`));
console.log('[Game] 상대방 수:', opponents.length);
```

---

### **Phase 4: 이벤트 핸들링 - 카드 내기** 🃏

#### 4.1 카드 내기 메시지 전송
- [ ] `handlePlayCard()` 수정
- [ ] `room.send("card_play", { cardId, suit, rank })` 전송
- [ ] 로컬 상태 업데이트 제거 (서버 응답 대기)

#### 4.2 서버 응답 처리
- [ ] `room.onMessage("card_play_response")` 리스너 (서버 구현 필요)
- [ ] 성공 시: 서버에서 업데이트된 상태 수신
- [ ] 실패 시: 에러 메시지 표시 및 롤백

#### 4.3 바닥 카드 업데이트
- [ ] 서버에서 `topCard` 브로드캐스트 또는 상태 동기화
- [ ] `discardPile` Schema 추가 또는 커스텀 메시지 사용

**예상 작업 시간**: 3-4시간  
**검증 방법**:
- 카드 클릭 시 서버로 메시지 전송 확인 (네트워크 탭)
- 서버 콘솔에서 메시지 수신 확인
- 카드가 바닥에 표시되는지 확인
- 내 핸드에서 카드 제거 확인

**디버깅 계획**:
```typescript
// 카드 내기 로그
const handlePlayCard = (card: Card) => {
  console.log('[Action] 카드 내기 시도:', card);
  room.send("card_play", { cardId: card.id, suit: card.suit, rank: card.rank });
};

room.onMessage("card_play_response", (response) => {
  console.log('[Action] 서버 응답:', response);
  if (response.success) {
    console.log('[Action] 카드 내기 성공');
  } else {
    console.error('[Action] 카드 내기 실패:', response.error);
  }
});
```

---

### **Phase 5: 이벤트 핸들링 - 카드 뽑기** 🎴

#### 5.1 카드 뽑기 메시지 전송
- [ ] `handleDrawCard()` 수정
- [ ] `room.send("draw_card")` 전송
- [ ] 로컬 랜덤 카드 생성 제거

#### 5.2 서버 응답 처리
- [ ] 서버에서 뽑은 카드를 `myHand`에 추가
- [ ] 상태 동기화로 자동 반영
- [ ] 정렬 모드 유지

#### 5.3 덱 카운트 업데이트
- [ ] 서버에서 `deckCount` 브로드캐스트 또는 Schema 추가
- [ ] 남은 카드 수 표시 업데이트

**예상 작업 시간**: 2-3시간  
**검증 방법**:
- 카드 뽑기 버튼 클릭 시 서버로 메시지 전송 확인
- 내 핸드에 새 카드 추가 확인
- 덱 카운트 감소 확인

**디버깅 계획**:
```typescript
// 카드 뽑기 로그
const handleDrawCard = () => {
  console.log('[Action] 카드 뽑기 시도');
  room.send("draw_card");
};

// 상태 변경으로 자동 반영됨
room.onStateChange((state) => {
  const myPlayer = state.players.get(room.sessionId);
  console.log('[State] 내 핸드 업데이트:', myPlayer?.hand.length);
});
```

---

### **Phase 6: 턴 관리 및 게임 흐름** ⏰

#### 6.1 턴 상태 동기화
- [ ] 서버에서 `currentTurn` Schema 추가 필요
- [ ] `state.currentTurn === sessionId`로 내 턴 판단
- [ ] `isMyTurn` 상태 업데이트

#### 6.2 턴 전환 감지
- [ ] `state.currentTurn` 변경 감지
- [ ] UI 업데이트 (버튼 활성화/비활성화)
- [ ] 턴 표시기 업데이트

#### 6.3 턴 종료 처리
- [ ] 카드 내기/뽑기 후 자동 턴 종료 (서버 처리)
- [ ] 또는 명시적 `end_turn` 메시지 전송

**예상 작업 시간**: 2-3시간  
**검증 방법**:
- 턴 전환 시 UI 업데이트 확인
- 내 턴이 아닐 때 카드 내기/뽑기 비활성화 확인

**디버깅 계획**:
```typescript
// 턴 관리 로그
room.onStateChange((state) => {
  const isMyTurn = state.currentTurn === room.sessionId;
  console.log('[Turn] 현재 턴:', state.currentTurn);
  console.log('[Turn] 내 턴 여부:', isMyTurn);
});
```

---

### **Phase 7: 고급 기능 및 최적화** 🚀

#### 7.1 공격 스택 관리
- [ ] 서버에서 `attackStack` Schema 추가
- [ ] 공격 카드 누적 시 UI 업데이트
- [ ] 방어 카드 처리

#### 7.2 방향 전환 (Q 카드)
- [ ] 서버에서 `direction` Schema 추가
- [ ] Q 카드 사용 시 방향 전환 동기화
- [ ] UI 표시기 업데이트

#### 7.3 문양 변경 (7 카드)
- [ ] 서버에서 `selectedSuit` Schema 추가
- [ ] 7 카드 사용 시 문양 선택 UI
- [ ] 선택한 문양 서버 전송

#### 7.4 재연결 처리
- [ ] 연결 끊김 감지
- [ ] 자동 재연결 로직
- [ ] 상태 복구

**예상 작업 시간**: 4-5시간  
**검증 방법**: 각 기능별 통합 테스트

---

### **Phase 8: 에러 핸들링 및 사용자 경험** 🛡️

#### 8.1 에러 처리
- [ ] 연결 실패 시 사용자 알림
- [ ] 메시지 전송 실패 처리
- [ ] 서버 에러 응답 처리

#### 8.2 로딩 상태
- [ ] 연결 중 로딩 화면
- [ ] 게임 시작 대기 화면
- [ ] 카드 처리 중 로딩 표시

#### 8.3 사용자 피드백
- [ ] 토스트 알림 (Sonner 활용)
- [ ] 성공/실패 메시지
- [ ] 게임 상태 변경 알림

**예상 작업 시간**: 2-3시간

---

## 📊 전체 작업 일정 예상

| Phase | 작업 내용 | 예상 시간 | 우선순위 |
|-------|----------|----------|----------|
| Phase 0 | 환경 설정 | 1-2시간 | 🔴 필수 |
| Phase 1 | 연결 확인 | 2-3시간 | 🔴 필수 |
| Phase 2 | 상태 동기화 | 3-4시간 | 🔴 필수 |
| Phase 3 | 게임 시작 | 2-3시간 | 🔴 필수 |
| Phase 4 | 카드 내기 | 3-4시간 | 🔴 필수 |
| Phase 5 | 카드 뽑기 | 2-3시간 | 🔴 필수 |
| Phase 6 | 턴 관리 | 2-3시간 | 🟡 중요 |
| Phase 7 | 고급 기능 | 4-5시간 | 🟢 선택 |
| Phase 8 | 에러 핸들링 | 2-3시간 | 🟡 중요 |

**총 예상 시간**: 23-30시간 (기본 기능: 15-20시간)

---

## 🔍 디버깅 전략

### 개발 환경 설정

1. **브라우저 개발자 도구**:
   - 콘솔: 연결 상태, 메시지 송수신 로그
   - 네트워크: WebSocket 연결 확인
   - React DevTools: 상태 변경 추적

2. **서버 모니터링**:
   - Colyseus 모니터: `http://localhost:2567/colyseus`
   - 서버 콘솔: 메시지 수신, 상태 변경 로그

3. **로깅 레벨**:
   ```typescript
   const DEBUG = import.meta.env.DEV; // 개발 모드에서만 로그
   
   const log = (category: string, message: string, data?: any) => {
     if (DEBUG) {
       console.log(`[${category}] ${message}`, data || '');
     }
   };
   ```

### 테스트 시나리오

1. **기본 연결 테스트**:
   - 단일 클라이언트 연결
   - 방 입장 확인
   - 상태 동기화 확인

2. **멀티플레이어 테스트**:
   - 2명 이상 동시 연결
   - 플레이어 목록 업데이트
   - 준비 상태 동기화

3. **게임 플레이 테스트**:
   - 카드 분배 확인
   - 카드 내기/뽑기
   - 턴 전환

---

## ⚠️ 주의사항 및 고려사항

### 타입 안정성
- 모든 타입 변환은 유틸리티 함수로 처리
- 런타임 타입 검증 고려 (zod 등)

### 성능
- 상태 변경 시 불필요한 리렌더링 방지 (`useMemo`, `useCallback`)
- 대량 카드 데이터 처리 최적화

### 보안
- 클라이언트에서 서버 검증 의존 (서버가 최종 판단)
- 민감한 정보(덱, 상대방 핸드)는 서버에서만 관리

### 백엔드 수정 필요 사항

**참고**: `@mafia/shared` 패키지에 메시지 타입이 정의되어 있습니다:
- `CardPlayMessage`, `DrawCardMessage`, `ReadyMessage`, `UseSkillMessage`
- `CardPlayResponseMessage`, `DrawCardResponseMessage`, `GameStartMessage` 등

**필요한 Schema 추가**:
- `topCard` Schema 추가 (또는 `GameStartMessage`로 브로드캐스트)
- `currentTurn` Schema 추가
- `attackStack` Schema 추가
- `direction` Schema 추가
- `deckCount` Schema 추가 (또는 브로드캐스트)

---

## 📝 다음 단계

승인 후 다음 순서로 진행:

1. **Phase 0 승인** → 환경 설정 및 기본 구조 생성
2. **Phase 1 승인** → 연결 테스트
3. **Phase 2 승인** → 상태 동기화 구현
4. 이후 단계별로 승인 후 진행

각 Phase 완료 후 검증 및 테스트를 거쳐 다음 Phase로 진행합니다.

---

**문서 작성일**: 2025년 1월  
**버전**: 1.0.0
