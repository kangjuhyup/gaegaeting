# Core Auth 모듈

## 사용 방법

### 일반 사용 (전체 모듈)
```typescript
import { AuthProvider } from '@core/auth';
```

### 타입만 사용 (테스트 환경 등)
```typescript
import { AuthProvider } from '@core/auth/types';
```

## 구조 설명

이 모듈은 두 가지 방식으로 import할 수 있습니다:

1. **전체 모듈 import**: `@core/auth`로 import하면 모든 기능(인증, 가드, 전략 등)을 사용할 수 있습니다.
2. **타입만 import**: `@core/auth/types`로 import하면 타입 정의만 가져오므로 passport 등의 의존성이 필요 없습니다. 테스트 환경에서 유용합니다.
