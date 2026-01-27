# Project Structure: MafiaOneCard

이 문서는 `MafiaOneCard` 프로젝트의 폴더 구조와 각 주요 파일/디렉토리의 역할을 설명합니다.
이 프로젝트는 **Monorepo** 구조로 리팩토링되었으며, 프론트엔드와 백엔드가 분리되어 관리됩니다.

## 디렉토리 구조 요약

```
MafiaOneCard/
├── package.json            # 루트 프로젝트 설정 (Workspaces 정의)
├── pnpm-lock.yaml          # 의존성 잠금 파일 (pnpm)
├── README.md               # 프로젝트 시작 및 실행 가이드
├── PROJECT_STRUCTURE.md    # 현재 문서 (구조 설명)
│
├── apps/                   # 애플리케이션 워크스페이스
│   ├── frontend/           # React 프론트엔드 애플리케이션 (@mafia/frontend)
│   └── backend/            # 백엔드 애플리케이션 (@mafia/backend)
│
└── packages/               # 공유 패키지 워크스페이스
    └── shared/             # 공통 로직 및 타입 정의 (@mafia/shared)
```

## 상세 구성 요소

### 1. Root (`/`)
- **package.json**: `pnpm install` 실행 시 모든 워크스페이스의 의존성을 효율적으로 설치합니다.
- **apps/**: 실제 서비스 코드(프론트엔드, 백엔드)가 위치하는 작업 공간입니다.
- **packages/**: 여러 서비스에서 공통으로 재사용하는 코드를 관리합니다.

### 2. Frontend (`apps/frontend`)
- **기술 스택**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn/UI, React DnD (드래그앤드롭)
- **상세 문서**: 프론트엔드의 구조, 컴포넌트, 유틸리티 함수 등에 대한 상세한 설명은 [`apps/frontend/README_FRONTEND.md`](./apps/frontend/README_FRONTEND.md)를 참조하세요.
- **주요 폴더 및 파일**:
  - `src/app/App.tsx`: 애플리케이션의 메인 상태(`GameState`)와 라우팅(화면 전환)을 담당합니다.
  - `src/app/components/`:
    - `GameScreen.tsx`: 핵심 게임 플레이 화면 (카드 덱, 핸드, 플레이어 정보)
    - `RoomScreen.tsx`: 대기방 및 방 코드 공유 기능
    - `CharacterSelectScreen.tsx`: 캐릭터 선택 화면 (접근성 적용됨)
  - `src/app/utils/gameLogic.ts`: 카드 덱 생성, 승패 판정, 카드 효과 등 순수 게임 로직이 포함됩니다.

### 3. Backend (`apps/backend`)
- **기술 스택**: Node.js, TypeScript (예정)
- **상태**: 초기 설정 완료. `src/index.ts`를 기점으로 API 서버가 구축될 예정입니다.
