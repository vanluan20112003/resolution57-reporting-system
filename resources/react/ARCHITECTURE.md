# Frontend Architecture - Feature-based Structure

## Tổng quan

Frontend của NQ57 Portal được tổ chức theo kiến trúc **feature-based** (dựa trên tính năng), giúp:
- Dễ dàng bảo trì và mở rộng
- Tái sử dụng code hiệu quả
- Tách biệt rõ ràng giữa các tính năng
- Dễ dàng test và debug

## Cấu trúc thư mục

```
src/
├── features/              # Các tính năng chính của ứng dụng
│   ├── auth/             # Tính năng xác thực
│   │   ├── api/          # API calls cho auth
│   │   │   └── authApi.ts
│   │   ├── components/   # Components liên quan đến auth
│   │   │   ├── LoginForm.tsx
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   └── index.ts
│   │   ├── hooks/        # Custom hooks cho auth
│   │   │   ├── useLogin.ts
│   │   │   ├── useGoogleAuth.ts
│   │   │   ├── useLogout.ts
│   │   │   └── index.ts
│   │   └── index.ts      # Barrel export
│   │
│   ├── user/             # Tính năng quản lý user
│   │   ├── components/
│   │   │   ├── UserDropdown.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── dashboard/        # Tính năng dashboard (để phát triển)
│
├── shared/               # Code dùng chung
│   ├── components/       # Components dùng chung
│   ├── hooks/            # Hooks dùng chung
│   │   ├── useLocalStorage.ts
│   │   ├── useAuth.ts
│   │   └── index.ts
│   └── utils/            # Utility functions
│
├── pages/                # Page components (containers)
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── GoogleCallbackPage.tsx
│
├── components/           # Legacy components (sẽ di chuyển dần)
├── config/               # Configuration files
│   └── api.ts            # Centralized API configuration
└── styles/               # Global styles

```

## Nguyên tắc tổ chức

### 1. Feature Folder Structure

Mỗi feature có cấu trúc riêng:
- **api/**: Chứa tất cả API calls liên quan
- **components/**: React components của feature
- **hooks/**: Custom hooks cho logic nghiệp vụ
- **types/**: TypeScript types/interfaces (nếu cần)
- **utils/**: Helper functions riêng cho feature
- **index.ts**: Barrel export để import dễ dàng

### 2. Pages vs Features

**Pages** (Container Components):
- Là điểm kết nối của các features
- Xử lý routing và layout
- Ít logic nghiệp vụ
- Compose các components từ features

**Features** (Business Logic):
- Chứa toàn bộ logic nghiệp vụ
- Có thể tái sử dụng ở nhiều pages
- Độc lập và dễ test

### 3. Shared Code

Code dùng chung cho nhiều features:
- **shared/hooks**: Hooks như `useAuth`, `useLocalStorage`
- **shared/components**: UI components như Button, Input (tuỳ chỉnh)
- **shared/utils**: Utility functions

## Ví dụ sử dụng

### Import từ feature

```typescript
// Bad - Import trực tiếp từ file
import LoginForm from '../features/auth/components/LoginForm'
import { useLogin } from '../features/auth/hooks/useLogin'

// Good - Import từ barrel export
import { LoginForm, useLogin } from '../features/auth'
```

### Sử dụng trong Page

```typescript
// LoginPage.tsx
import { LoginForm, GoogleLoginButton } from '../features/auth'

function LoginPage() {
  return (
    <div>
      <LoginForm />
      <GoogleLoginButton />
    </div>
  )
}
```

### Tạo custom hook mới

```typescript
// features/auth/hooks/useLogin.ts
import { useState } from 'react'
import { loginWithCredentials } from '../api/authApi'

export const useLogin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = async (credentials) => {
    setLoading(true)
    try {
      const data = await loginWithCredentials(credentials)
      // Handle success
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return { login, loading, error }
}
```

## Migration Plan

### Hoàn thành ✅
1. Tạo feature structure cho `auth`
2. Tạo feature structure cho `user`
3. Tạo shared hooks (`useAuth`, `useLocalStorage`)
4. Refactor LoginPage sử dụng auth features
5. Refactor DashboardPage sử dụng user features

### Kế hoạch tiếp theo
1. Di chuyển ResolutionList sang `features/dashboard`
2. Tạo feature cho Activities management
3. Tạo feature cho Reports
4. Tạo feature cho KPIs
5. Di chuyển LanguageSwitcher vào `shared/components`

## Best Practices

### 1. Single Responsibility
Mỗi component/hook chỉ làm một việc duy nhất.

### 2. Composition over Inheritance
Sử dụng component composition thay vì inheritance.

### 3. Custom Hooks for Logic
Tách logic nghiệp vụ ra khỏi components bằng custom hooks.

### 4. API Layer Separation
Tất cả API calls nằm trong `api/` folder, không gọi trực tiếp trong components.

### 5. Type Safety
Sử dụng TypeScript interfaces cho tất cả props và data.

## Testing Strategy

### Unit Tests
- Test hooks với `@testing-library/react-hooks`
- Test API layer với mock fetch
- Test utility functions

### Integration Tests
- Test components với user interactions
- Test feature workflows (login flow, etc.)

### E2E Tests
- Test toàn bộ user journey từ login đến dashboard

## Performance Optimization

### Code Splitting
```typescript
// Lazy load features khi cần
const Dashboard = lazy(() => import('./features/dashboard'))
```

### Memoization
```typescript
// Sử dụng useMemo cho expensive calculations
const filteredData = useMemo(() =>
  data.filter(item => item.active),
  [data]
)
```

### Custom Hooks Optimization
```typescript
// useCallback để tránh re-render không cần thiết
const login = useCallback(async (credentials) => {
  // login logic
}, [])
```

## Tài liệu tham khảo

- [React Best Practices](https://react.dev/learn)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Clean Architecture in React](https://dev.to/rubemfsv/clean-architecture-in-react-2lc5)
