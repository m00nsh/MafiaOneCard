# MafiaOneCard Monorepo

이 프로젝트는 Monorepo 구조로 리팩토링되었습니다.

## 구조
- `apps/frontend`: React 프론트엔드 애플리케이션
  - 상세 아키텍처 문서: [`apps/frontend/README_ARCHITECTURE.md`](./apps/frontend/README_ARCHITECTURE.md)
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

## 트러블슈팅

### 라이브러리 의존성 문제 해결

프로젝트에서 라이브러리 버전 충돌이나 호환성 문제가 발생할 수 있습니다. 다음과 같은 방법으로 해결할 수 있습니다.

#### 1. pnpm.overrides를 사용한 버전 강제 지정

루트 `package.json`의 `pnpm.overrides` 섹션을 사용하여 특정 패키지의 버전을 강제로 지정할 수 있습니다.

```json
{
  "pnpm": {
    "overrides": {
      "패키지명": "버전"
    }
  }
}
```

**예시:**
- 현재 프로젝트에서는 `@colyseus/schema`를 `^3.0.0-alpha.36`으로 강제 지정하고 있습니다.
- `vite` 버전도 `6.3.5`로 고정되어 있습니다.

**주의사항:**
- `pnpm.overrides`는 **루트 `package.json`**에만 설정해야 합니다.
- 워크스페이스별 `package.json`의 `overrides`는 무시됩니다.
- 버전을 변경한 후에는 반드시 의존성을 재설치해야 합니다.

#### 2. 의존성 재설치

버전 충돌이나 호환성 문제가 발생하면 다음 순서로 재설치하세요:

```bash
# 1. node_modules와 lock 파일 삭제
rm -rf node_modules pnpm-lock.yaml
rm -rf apps/*/node_modules packages/*/node_modules

# 2. 루트에서 재설치
pnpm install
```

**Windows PowerShell 사용 시:**
```powershell
# node_modules 삭제
Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml
Remove-Item -Recurse -Force apps\*\node_modules, packages\*\node_modules

# 재설치
pnpm install
```

#### 3. 특정 워크스페이스만 재설치

특정 워크스페이스의 의존성만 재설치하려면:

```bash
# 프론트엔드만 재설치
cd apps/frontend
rm -rf node_modules
cd ../..
pnpm install --filter @mafia/frontend

# 백엔드만 재설치
cd apps/backend
rm -rf node_modules
cd ../..
pnpm install --filter @mafia/backend
```

#### 4. 버전 호환성 확인

의존성 문제가 발생하면 다음을 확인하세요:

1. **Peer Dependencies 확인:**
   ```bash
   pnpm why 패키지명
   ```

2. **설치된 버전 확인:**
   ```bash
   pnpm list 패키지명
   ```

3. **패키지 정보 확인:**
   ```bash
   pnpm info 패키지명 versions
   ```

#### 5. 일반적인 문제 해결

**문제: "Cannot find module" 또는 "Module not found"**
- 의존성이 제대로 설치되지 않았을 수 있습니다.
- 위의 재설치 방법을 시도하세요.

**문제: 버전 호환성 오류**
- `pnpm.overrides`를 사용하여 호환되는 버전으로 강제 지정하세요.
- 공식 문서에서 권장 버전을 확인하세요.

**문제: TypeScript 데코레이터 오류**
- `tsconfig.json`에 `experimentalDecorators: true`와 `emitDecoratorMetadata: true`가 설정되어 있는지 확인하세요.
- `useDefineForClassFields: false`로 설정되어 있는지 확인하세요.

## 문서

- [프로젝트 구조](./PROJECT_STRUCTURE.md): 전체 프로젝트 구조 및 각 디렉토리 역할
- [프론트엔드 아키텍처](./apps/frontend/README_ARCHITECTURE.md): 프론트엔드 상세 기능 정의서 (컴포넌트, 유틸리티, 화면 흐름 등)