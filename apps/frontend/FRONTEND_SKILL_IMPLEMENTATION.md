# 프론트엔드 스킬 시스템 구현 가이드

## 📋 개요

백엔드에 스킬 시스템이 구현되었으므로, 프론트엔드에서 스킬 UI와 로직을 구현해야 합니다.

## 🔍 백엔드 변경사항 분석

### 1. 새로운 메시지 타입

#### 클라이언트 → 서버
- **`use_skill`**: 스킬 사용 요청
  ```typescript
  interface UseSkillMessage {
    skillId: CharacterId;
    targetPlayerId?: string;      // 대상 플레이어 (필요한 스킬)
    selectedCardId?: string;       // 선택한 카드 (잡상인)
    selectedSuit?: CardSuit;      // 선택한 문양 (필요한 경우)
  }
  ```

#### 서버 → 클라이언트
- **`skill_used`**: 스킬 사용 알림
  ```typescript
  interface SkillUsedMessage {
    playerId: string;
    skillId: CharacterId;
    targetPlayerId?: string;
  }
  ```

- **`announcement`**: 게임 공지사항
  ```typescript
  interface AnnouncementMessage {
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }
  ```

### 2. PlayerSchema에 추가된 필드

```typescript
class PlayerSchema {
  skillProgress: number;        // 현재 쿨타임 진행도 (0 ~ skillMaxCooldown)
  skillMaxCooldown: number;      // 최대 쿨타임
  skillUsesLeft: number;         // 남은 사용 횟수 (소환사, 광전사)
  activeEffects: string[];      // 활성 효과 (예: "shaman_cursed")
}
```

### 3. 스킬 쿨타임 시스템

- 턴 시작 시 자동으로 `skillProgress`가 증가
- `skillProgress >= skillMaxCooldown`이면 스킬 사용 가능
- `skillUsesLeft > 0`이면 스킬 사용 가능 (소환사, 광전사)

---

## ✅ 프론트엔드 구현 작업 목록

### Phase 1: 스킬 UI 기본 구조

#### 1.1 스킬 버튼 컴포넌트 생성
**파일**: `apps/frontend/src/app/components/game/SkillButton.tsx`

**기능**:
- 스킬 버튼 UI (쿨타임 게이지 포함)
- 사용 가능 여부 표시
- 클릭 시 스킬 사용 다이얼로그 열기

**Props**:
```typescript
interface SkillButtonProps {
  characterId: CharacterId;
  skillProgress: number;
  skillMaxCooldown: number;
  skillUsesLeft: number;
  isMyTurn: boolean;
  isPlaying: boolean;
  onSkillClick: () => void;
}
```

#### 1.2 스킬 사용 다이얼로그 컴포넌트
**파일**: `apps/frontend/src/app/components/game/SkillDialog.tsx`

**기능**:
- 스킬별로 다른 UI 표시
- 대상 플레이어 선택 (필요한 스킬)
- 카드 선택 (잡상인)
- 스킬 사용 확인

**스킬별 UI 요구사항**:
- **잡상인**: 내 손패에서 카드 선택 + 대상 플레이어 선택
- **탱커**: 공격 스택이 있을 때만 사용 가능 (버튼 비활성화 표시)
- **도둑**: 추가 선택 없음 (즉시 사용)
- **예언자**: 추가 선택 없음 (즉시 사용)
- **주술사**: 대상 플레이어 선택
- **소환사**: 대상 플레이어 선택 (해당 플레이어의 스킬 사용)
- **암살자**: 대상 플레이어 선택
- **광전사**: 대상 플레이어 2명 선택 (2인 플레이에서는 1명)

#### 1.3 BottomArea 컴포넌트 수정
**파일**: `apps/frontend/src/app/components/game/BottomArea.tsx`

**변경사항**:
- `SkillButton` 컴포넌트 추가
- `gameState`에서 스킬 관련 정보 가져오기
- 스킬 사용 가능 여부 계산

---

### Phase 2: 스킬 로직 구현

#### 2.1 useColyseusRoom 훅 확장
**파일**: `apps/frontend/src/app/hooks/useColyseusRoom.ts`

**추가 기능**:
- `useSkill` 함수 추가
- `skill_used` 메시지 리스너
- `announcement` 메시지 리스너

**구현 예시**:
```typescript
const useSkill = useCallback((skillId: CharacterId, options?: {
  targetPlayerId?: string;
  selectedCardId?: string;
  selectedSuit?: CardSuit;
}) => {
  if (!room) return;
  
  room.send('use_skill', {
    skillId,
    targetPlayerId: options?.targetPlayerId,
    selectedCardId: options?.selectedCardId,
    selectedSuit: options?.selectedSuit,
  });
}, [room]);
```

#### 2.2 스킬 유틸리티 함수
**파일**: `apps/frontend/src/app/utils/skillUtils.ts`

**기능**:
- 스킬 사용 가능 여부 판단
- 스킬별 필요한 입력값 검증
- 스킬 설명 텍스트 반환

**함수 목록**:
```typescript
// 스킬 사용 가능 여부 확인
function canUseSkill(
  characterId: CharacterId,
  skillProgress: number,
  skillMaxCooldown: number,
  skillUsesLeft: number,
  attackStack: number,
  isMyTurn: boolean,
  isPlaying: boolean
): boolean

// 스킬별 필요한 입력값 확인
function getSkillRequiredInputs(characterId: CharacterId): {
  needsTarget: boolean;
  needsCard: boolean;
  needsSuit: boolean;
  targetCount: number; // 광전사는 2명
}

// 스킬 설명 반환
function getSkillDescription(characterId: CharacterId): string
```

#### 2.3 GameScreen에서 스킬 통합
**파일**: `apps/frontend/src/app/components/GameScreen.tsx`

**변경사항**:
- `useColyseusRoom`에서 스킬 관련 함수 가져오기
- 스킬 사용 핸들러 추가
- 스킬 다이얼로그 상태 관리
- `skill_used`, `announcement` 메시지 처리

---

### Phase 3: 스킬별 특수 처리

#### 3.1 잡상인 스킬
- 내 손패에서 카드 선택 UI
- 대상 플레이어 선택 UI
- 선택한 카드가 손패에서 제거되는 시각적 피드백

#### 3.2 탱커 스킬
- 공격 스택이 있을 때만 버튼 활성화
- 공격 스택이 없으면 비활성화 + 툴팁 표시

#### 3.3 주술사 스킬
- 대상 플레이어 선택
- 대상 플레이어에게 "스킬 사용 거부" 옵션 제공 (향후 구현)
- 현재는 자동으로 거부 시 페널티 적용 (백엔드에서 처리)

#### 3.4 소환사 스킬
- 대상 플레이어 선택
- 선택한 플레이어의 스킬 목록 표시
- 사용 횟수 표시 (`skillUsesLeft`)

#### 3.5 광전사 스킬
- 대상 플레이어 2명 선택 (2인 플레이에서는 1명)
- 플레이어 수에 따른 UI 조정

#### 3.6 예언자 스킬
- 다음 플레이어의 카드 3장 표시 다이얼로그
- 카드 정보 표시 (문양, 숫자)

---

### Phase 4: 쿨타임 UI 개선

#### 4.1 쿨타임 게이지 바
**위치**: `SkillButton` 컴포넌트 내부

**표시 내용**:
- 현재 진행도 / 최대 쿨타임
- 사용 가능 여부 (게이지가 가득 찬 경우)
- 남은 사용 횟수 (소환사, 광전사)

**시각적 표현**:
```typescript
// 쿨타임 게이지
const progress = skillMaxCooldown > 0 
  ? (skillProgress / skillMaxCooldown) * 100 
  : 100;

// 사용 가능 여부
const isAvailable = skillMaxCooldown > 0
  ? skillProgress >= skillMaxCooldown
  : skillUsesLeft > 0;
```

#### 4.2 턴 시작 시 쿨타임 업데이트
- `gameState.currentTurn`이 변경될 때 자동으로 쿨타임 업데이트
- 내 턴이 시작되면 쿨타임이 1 증가하는 것을 시각적으로 표시

---

### Phase 5: 스킬 사용 피드백

#### 5.1 토스트 알림
- 스킬 사용 성공/실패 알림
- `announcement` 메시지를 토스트로 표시

#### 5.2 스킬 사용 애니메이션
- 스킬 버튼 클릭 시 애니메이션
- 스킬 사용 후 쿨타임 리셋 애니메이션

#### 5.3 스킬 효과 표시
- 주술사: 대상 플레이어에게 저주 효과 표시
- 예언자: 카드 확인 다이얼로그
- 암살자/광전사: 대상 플레이어가 카드를 받는 애니메이션

---

## 📝 구현 우선순위

### 🔴 High Priority (필수)
1. ✅ **스킬 버튼 UI** - 기본 스킬 버튼과 쿨타임 게이지
2. ✅ **useSkill 함수** - 서버로 스킬 사용 메시지 전송
3. ✅ **스킬 사용 가능 여부 판단** - 쿨타임/사용 횟수 확인
4. ✅ **기본 스킬 다이얼로그** - 스킬 사용 확인 다이얼로그

### 🟡 Medium Priority (중요)
5. ✅ **대상 플레이어 선택 UI** - 주술사, 소환사, 암살자, 광전사
6. ✅ **잡상인 카드 선택 UI** - 내 손패에서 카드 선택
7. ✅ **스킬 사용 피드백** - 토스트 알림 및 애니메이션
8. ✅ **쿨타임 자동 업데이트** - 턴 시작 시 쿨타임 증가

### 🟢 Low Priority (향후 개선)
9. ⚪ **예언자 카드 확인 UI** - 다음 플레이어 카드 표시
10. ⚪ **주술사 거부 옵션** - 대상 플레이어가 거부할 수 있는 UI
11. ⚪ **스킬 사용 통계** - 게임 종료 시 스킬 사용 횟수 표시

---

## 🔗 관련 파일 목록

### 수정 필요 파일
- `apps/frontend/src/app/components/game/BottomArea.tsx` - 스킬 버튼 추가
- `apps/frontend/src/app/components/GameScreen.tsx` - 스킬 로직 통합
- `apps/frontend/src/app/hooks/useColyseusRoom.ts` - 스킬 메시지 처리

### 새로 생성할 파일
- `apps/frontend/src/app/components/game/SkillButton.tsx` - 스킬 버튼 컴포넌트
- `apps/frontend/src/app/components/game/SkillDialog.tsx` - 스킬 사용 다이얼로그
- `apps/frontend/src/app/components/game/PlayerSelectDialog.tsx` - 플레이어 선택 다이얼로그
- `apps/frontend/src/app/components/game/CardSelectDialog.tsx` - 카드 선택 다이얼로그 (잡상인)
- `apps/frontend/src/app/utils/skillUtils.ts` - 스킬 유틸리티 함수

---

## 📚 참고 자료

- **GAME_RULEBOOK.md**: 캐릭터별 스킬 상세 설명
- **packages/shared/src/index.ts**: 스킬 타입 정의 (`CharacterId`, `CHARACTER_SKILLS`, `UseSkillMessage`)
- **apps/backend/src/rooms/MafiaRoom.ts**: 스킬 메시지 핸들러

---

## 🎯 다음 단계

1. **Phase 1 시작**: `SkillButton` 컴포넌트 생성 및 `BottomArea`에 통합
2. **Phase 2 진행**: `useSkill` 함수 구현 및 메시지 리스너 추가
3. **Phase 3 구현**: 스킬별 특수 처리 로직 추가
4. **테스트**: 각 스킬이 정상적으로 작동하는지 확인
