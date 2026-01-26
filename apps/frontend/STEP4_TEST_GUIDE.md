# Step 4 테스트 가이드

## 🧪 테스트 환경 설정

### 1. 서버 실행 확인

#### 백엔드 서버 (포트 2567)
```bash
cd apps/backend
pnpm run dev
```

**예상 출력:**
```
Colyseus 서버가 http://localhost:2567 에서 실행 중입니다.
```

#### 프론트엔드 서버 (포트 5173)
```bash
cd apps/frontend
pnpm run dev
```

**예상 출력:**
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## ✅ 테스트 체크리스트

### Phase 1: 연결 확인

- [ ] **백엔드 서버 실행 확인**
  - 브라우저에서 `http://localhost:2567` 접속
  - "게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏" 메시지 확인

- [ ] **프론트엔드 서버 실행 확인**
  - 브라우저에서 `http://localhost:5173` 접속
  - GameScreen 화면이 표시되는지 확인

- [ ] **연결 상태 UI 확인**
  - 우측 상단에 연결 상태 표시기 확인
  - 초기 상태: "연결 중..." (노란색 점)
  - 연결 성공: "연결됨" (초록색 점, 펄스 애니메이션)

---

### Phase 2: 상태 동기화 확인

#### 2.1 콘솔 로그 확인

브라우저 개발자 도구 (F12) → Console 탭에서 다음 로그 확인:

**연결 성공 시:**
```
[Colyseus] 클라이언트 초기화: ws://localhost:2567
[Colyseus] 방 연결 시도: mafia_room {name: "Player-xxxxx"}
[Colyseus] 방 연결 성공: <sessionId>
[Colyseus] 초기 상태 동기화 완료
```

**상태 변경 시:**
```
[Colyseus] 상태 변경: GameStateSchema {status: "LOBBY", players: Map(1), ...}
```

#### 2.2 게임 상태 확인

**React DevTools 사용:**
1. React DevTools 확장 프로그램 설치
2. Components 탭에서 `GameScreen` 컴포넌트 선택
3. `gameState` prop 확인:
   ```javascript
   {
     status: "LOBBY" | "PLAYING" | "ENDED",
     players: Map<string, PlayerInfo>,
     myPlayer: PlayerInfo | null,
     myHand: UICard[],
     currentTurn: string | null,
     direction: "clockwise" | "counter-clockwise",
     attackStack: number,
     topCard: UICard | null,
     selectedSuit: CardSuit | null,
     deckCount: number,
     winnerId: string | null
   }
   ```

#### 2.3 UI 상태 반영 확인

- [ ] **플레이어 정보 표시**
  - 서버에서 받은 플레이어 정보가 Opponent 컴포넌트에 표시되는지 확인
  - 닉네임, 캐릭터, 카드 수가 올바르게 표시되는지 확인

- [ ] **내 핸드 카드**
  - 서버에서 받은 `myHand`가 화면에 표시되는지 확인
  - 카드가 올바르게 렌더링되는지 확인

- [ ] **게임 상태 표시**
  - `topCard`: 바닥 카드가 표시되는지 확인
  - `deckCount`: 남은 카드 수가 표시되는지 확인
  - `attackStack`: 공격 스택이 표시되는지 확인 (0이면 숨김)
  - `direction`: 턴 방향 표시기가 올바른지 확인
  - `currentTurn`: 현재 턴인 플레이어가 하이라이트되는지 확인

---

### Phase 3: 상태 변경 테스트

#### 3.1 서버 상태 변경 테스트

**백엔드 콘솔에서 확인:**
- 플레이어 입장 시: `"<sessionId>님이 게임에 참여했습니다!"`
- 준비 상태 변경 시: `"<sessionId> is ready: true/false"`

**프론트엔드 콘솔에서 확인:**
- 상태 변경 로그가 출력되는지 확인
- UI가 자동으로 업데이트되는지 확인

#### 3.2 다중 플레이어 테스트

1. **두 개의 브라우저 창 열기**
   - 첫 번째: `http://localhost:5173`
   - 두 번째: `http://localhost:5173` (시크릿 모드 또는 다른 브라우저)

2. **각 창에서 확인:**
   - 각각 다른 `sessionId`를 받는지 확인
   - 서로 다른 플레이어로 인식되는지 확인
   - 한 플레이어의 상태 변경이 다른 플레이어에게 반영되는지 확인

---

## 🐛 문제 해결

### 연결 실패 시

**증상:** "연결 실패" 또는 "연결 끊김" 표시

**확인 사항:**
1. 백엔드 서버가 실행 중인지 확인
2. 포트 2567이 사용 가능한지 확인
3. 방화벽 설정 확인
4. 콘솔 에러 메시지 확인

**해결 방법:**
```bash
# 포트 사용 확인 (Windows)
netstat -ano | findstr :2567

# 백엔드 재시작
cd apps/backend
pnpm run dev
```

### 상태가 동기화되지 않을 때

**증상:** UI가 업데이트되지 않음

**확인 사항:**
1. 콘솔에 `[Colyseus] 상태 변경` 로그가 출력되는지 확인
2. `gameState`가 `null`이 아닌지 확인
3. React DevTools에서 상태 변경 확인

**디버깅 코드 추가:**
```typescript
// useColyseusRoom.ts의 onStateChange 내부에 추가
console.log('[DEBUG] 상태 상세:', {
  status: state.status,
  playersCount: state.players.size,
  currentTurn: state.currentTurn,
  direction: state.direction,
  attackStack: state.attackStack,
  topCard: state.topCard,
  deckCount: state.deckCount,
});
```

### 타입 에러 발생 시

**증상:** TypeScript 컴파일 에러

**확인 사항:**
1. `@mafia/shared` 패키지가 최신인지 확인
2. `pnpm install` 재실행
3. 타입 정의가 올바른지 확인

---

## 📊 예상 결과

### 정상 작동 시

1. **연결 성공**
   - 우측 상단에 "연결됨" 표시
   - 콘솔에 연결 성공 로그

2. **상태 동기화**
   - 초기 상태: `status: "LOBBY"`, `players: Map(1)`
   - 내 플레이어 정보가 `myPlayer`에 설정됨
   - `myHand`가 빈 배열 또는 서버에서 받은 카드로 채워짐

3. **UI 업데이트**
   - 플레이어 정보가 화면에 표시됨
   - 카드가 올바르게 렌더링됨
   - 게임 상태가 UI에 반영됨

---

## 🎯 다음 단계

Step 4 테스트가 성공하면:
- ✅ Step 5: 게임 시작 및 카드 분배
- ✅ Step 6: 게임 액션 구현
- ✅ Step 7: 고급 기능

---

**테스트 완료 날짜:** _작성 후 기록_
**테스터:** _이름_
**결과:** ✅ 성공 / ❌ 실패 (상세 내용 기록)
