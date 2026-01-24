# MafiaOneCard Monorepo

이 프로젝트는 Monorepo 구조로 리팩토링되었습니다.

## 구조
- `apps/frontend`: 기존 React 프론트엔드 애플리케이션
- `apps/backend`: Node.js 백엔드 애플리케이션 (예정)

## 시작하기 (Getting Started)

의존성 설치:
```bash
npm install
```

## 사용 가능한 명령어

### 프론트엔드 실행
개발 서버 시작:
```bash
npm run dev:frontend
# 또는
npm run dev -w @mafia/frontend
```

빌드:
```bash
npm run build:frontend
```

### 백엔드 실행
개발 서버 시작:
```bash
npm run dev:backend
```