# MafiaOneCard Monorepo

이 프로젝트는 Monorepo 구조로 리팩토링되었습니다.

## 구조
- `apps/frontend`: React 프론트엔드 애플리케이션
- `apps/backend`: Node.js 백엔드 애플리케이션 (예정)
- `packages/shared`: 공통/공유 패키지

## 시작하기 (Getting Started)

이 프로젝트는 **pnpm**을 패키지 매니저로 사용합니다.

의존성 설치:
```bash
pnpm install
```

## 사용 가능한 명령어

### 프론트엔드 실행
개발 서버 시작:
```bash
pnpm run dev:frontend
# 또는
pnpm --filter @mafia/frontend dev
```

빌드:
```bash
pnpm run build:frontend
```

### 백엔드 실행
개발 서버 시작:
```bash
pnpm run dev:backend
```