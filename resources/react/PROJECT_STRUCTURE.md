# 📁 Cấu trúc Dự án NQ57 Portal - Professional Structure

## 🎯 Tổng quan

Dự án được tổ chức theo kiến trúc **Feature-based** kết hợp **Layered Architecture** để dễ dàng mở rộng và bảo trì.

```
src/
├── api/                    # API client & services
│   ├── client.ts          # Axios instance configuration
│   ├── endpoints.ts       # API endpoint constants
│   └── services/          # API service modules
│       ├── authService.ts
│       ├── resolutionService.ts
│       └── userService.ts
│
├── assets/                 # Static assets
│   ├── images/            # Images
│   ├── icons/             # SVG icons
│   └── fonts/             # Custom fonts
│
├── components/             # Reusable components
│   ├── common/            # Common/Shared components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   └── index.ts
│   └── Dashboard/         # Dashboard-specific components
│       ├── ResolutionList.tsx
│       └── index.ts
│
├── config/                 # App configuration
│   ├── app.config.ts      # General app config
│   ├── api.config.ts      # API configuration
│   └── theme.config.ts    # Theme configuration
│
├── constants/              # Application constants
│   ├── routes.ts          # Route constants
│   ├── api.ts             # API constants
│   ├── messages.ts        # Message constants
│   └── index.ts           # Export all constants
│
├── contexts/               # React contexts
│   ├── AuthContext.tsx    # Authentication context
│   ├── ThemeContext.tsx   # Theme context
│   └── index.ts
│
├── features/               # Feature modules (future)
│   ├── resolutions/       # Resolution feature
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   ├── reports/           # Reports feature
│   └── analytics/         # Analytics feature
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts         # Authentication hook
│   ├── useDebounce.ts     # Debounce hook
│   ├── useLocalStorage.ts # LocalStorage hook
│   └── index.ts
│
├── layouts/                # Layout components
│   ├── DashboardLayout.tsx
│   ├── AuthLayout.tsx
│   ├── PublicLayout.tsx
│   └── index.ts
│
├── lib/                    # Utility libraries
│   ├── axios.ts           # Axios configuration
│   ├── helpers.ts         # Helper functions
│   ├── validators.ts      # Validation functions
│   └── index.ts
│
├── pages/                  # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── HomePage.jsx
│   └── index.ts
│
├── services/               # Business logic services
│   ├── auth.service.ts
│   ├── storage.service.ts
│   └── index.ts
│
├── store/                  # State management (Zustand)
│   ├── slices/            # Store slices
│   │   ├── authSlice.ts
│   │   ├── uiSlice.ts
│   │   └── index.ts
│   └── index.ts
│
├── styles/                 # Styles
│   ├── global.css         # Global styles
│   ├── variables.css      # CSS variables
│   ├── LoginPage.css
│   ├── DashboardPage.css
│   └── index.css
│
├── types/                  # TypeScript types/interfaces
│   ├── auth.ts
│   ├── resolution.ts
│   ├── user.ts
│   └── index.ts
│
├── utils/                  # Utility functions
│   ├── date.ts            # Date utilities
│   ├── format.ts          # Formatting utilities
│   ├── validation.ts      # Validation utilities
│   └── index.ts
│
├── App.jsx                 # Main App component
├── main.jsx                # Entry point
└── vite-env.d.ts          # Vite type definitions
```

## 📝 Chi tiết từng thư mục

### 1. `/api` - API Layer
Chứa tất cả logic giao tiếp với backend API.

**Mục đích:**
- Centralize API calls
- Dễ dàng thay đổi endpoint
- Reusable API services

**Files:**
- `client.ts`: Axios instance với interceptors
- `endpoints.ts`: API endpoint constants
- `services/`: Các service cho từng resource

### 2. `/components` - UI Components
Chứa các reusable components.

**Cấu trúc:**
```
components/
├── common/          # Shared components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.css
│   │   └── index.ts
│   └── ...
└── [Feature]/       # Feature-specific components
```

### 3. `/config` - Configuration
Chứa các file cấu hình của ứng dụng.

**Files:**
- `app.config.ts`: App name, version, etc.
- `api.config.ts`: Base URL, timeout, etc.
- `theme.config.ts`: Theme colors, fonts, etc.

### 4. `/constants` - Constants
Chứa các hằng số sử dụng trong app.

**Files:**
- `routes.ts`: Route paths
- `api.ts`: API constants
- `messages.ts`: Error/Success messages

### 5. `/contexts` - React Contexts
Chứa các React Context cho global state.

**Files:**
- `AuthContext.tsx`: Authentication state
- `ThemeContext.tsx`: Theme state

### 6. `/features` - Feature Modules
Mỗi feature là một module độc lập.

**Cấu trúc feature:**
```
features/resolutions/
├── components/      # Feature components
├── hooks/           # Feature hooks
├── services/        # Feature services
├── types/           # Feature types
├── utils/           # Feature utilities
└── index.ts         # Public API
```

### 7. `/hooks` - Custom Hooks
Chứa các custom React hooks.

**Examples:**
- `useAuth()`: Authentication logic
- `useDebounce()`: Debounce values
- `useFetch()`: Data fetching

### 8. `/layouts` - Layouts
Chứa các layout components.

**Files:**
- `DashboardLayout.tsx`: Layout cho dashboard
- `AuthLayout.tsx`: Layout cho auth pages
- `PublicLayout.tsx`: Layout cho public pages

### 9. `/lib` - Libraries
Chứa các third-party library configurations.

**Files:**
- `axios.ts`: Axios setup
- `dayjs.ts`: Date library setup
- `helpers.ts`: Helper functions

### 10. `/pages` - Pages
Chứa các page components (routable).

**Convention:**
- File name: `[Name]Page.tsx`
- Export default: Component

### 11. `/services` - Business Logic
Chứa business logic, không phụ thuộc UI.

**Examples:**
- `auth.service.ts`: Authentication logic
- `storage.service.ts`: LocalStorage/SessionStorage
- `notification.service.ts`: Notifications

### 12. `/store` - State Management
Zustand store cho global state.

**Cấu trúc:**
```
store/
├── slices/
│   ├── authSlice.ts     # Auth state
│   ├── uiSlice.ts       # UI state
│   └── index.ts
└── index.ts             # Combined store
```

### 13. `/styles` - Styles
Chứa tất cả CSS files.

**Files:**
- `global.css`: Global styles
- `variables.css`: CSS variables
- `[Component].css`: Component styles

### 14. `/types` - TypeScript Types
Chứa tất cả TypeScript types/interfaces.

**Convention:**
- One file per domain (auth, user, etc.)
- Export interfaces, types, enums

### 15. `/utils` - Utilities
Chứa các utility functions.

**Examples:**
- `date.ts`: Date formatting/parsing
- `format.ts`: Number, currency formatting
- `validation.ts`: Validation functions

## 🎨 Naming Conventions

### Files
- **Components**: `PascalCase.tsx` (e.g., `Button.tsx`)
- **Hooks**: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- **Services**: `camelCase.service.ts` (e.g., `auth.service.ts`)
- **Types**: `camelCase.ts` (e.g., `auth.ts`)
- **Utils**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Constants**: `UPPER_SNAKE_CASE.ts` or `camelCase.ts`

### Variables
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

### Folders
- **kebab-case** hoặc **camelCase** (consistent trong project)

## 📦 Import/Export Patterns

### Index files
Mỗi folder nên có `index.ts` để export public API:

```typescript
// components/common/index.ts
export { default as Button } from './Button/Button'
export { default as Input } from './Input/Input'
export { default as Modal } from './Modal/Modal'
```

### Import order
```typescript
// 1. External libraries
import React from 'react'
import { Button, Input } from 'antd'

// 2. Internal absolute imports
import { useAuth } from '@hooks'
import { authService } from '@services'

// 3. Internal relative imports
import { Header } from './Header'
import styles from './styles.module.css'

// 4. Types
import type { User } from '@types'
```

## 🔧 Configuration Files

### Path Aliases (vite.config.js)
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@components': path.resolve(__dirname, './src/components'),
    '@pages': path.resolve(__dirname, './src/pages'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@utils': path.resolve(__dirname, './src/utils'),
    '@services': path.resolve(__dirname, './src/services'),
    '@store': path.resolve(__dirname, './src/store'),
    '@types': path.resolve(__dirname, './src/types'),
    '@api': path.resolve(__dirname, './src/api'),
    '@config': path.resolve(__dirname, './src/config'),
    '@constants': path.resolve(__dirname, './src/constants'),
    '@layouts': path.resolve(__dirname, './src/layouts'),
    '@contexts': path.resolve(__dirname, './src/contexts'),
    '@lib': path.resolve(__dirname, './src/lib'),
    '@assets': path.resolve(__dirname, './src/assets'),
    '@features': path.resolve(__dirname, './src/features'),
  },
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@types/*": ["src/types/*"],
      "@api/*": ["src/api/*"],
      "@config/*": ["src/config/*"],
      "@constants/*": ["src/constants/*"],
      "@layouts/*": ["src/layouts/*"],
      "@contexts/*": ["src/contexts/*"],
      "@lib/*": ["src/lib/*"],
      "@assets/*": ["src/assets/*"],
      "@features/*": ["src/features/*"]
    }
  }
}
```

## 🚀 Mở rộng trong tương lai

### Thêm feature mới
1. Tạo folder trong `/features/[feature-name]`
2. Tạo components, hooks, services trong feature
3. Export public API qua `index.ts`
4. Import vào app: `import { FeatureComponent } from '@features/feature-name'`

### Thêm page mới
1. Tạo file trong `/pages/[PageName].tsx`
2. Thêm route trong `App.jsx`
3. Thêm route constant trong `/constants/routes.ts`

### Thêm API service
1. Tạo file trong `/api/services/[resource].service.ts`
2. Define endpoints trong `/api/endpoints.ts`
3. Export service trong `/api/services/index.ts`

## 📚 Best Practices

1. **Single Responsibility**: Mỗi file/component chỉ làm một việc
2. **DRY (Don't Repeat Yourself)**: Tái sử dụng code qua components/hooks
3. **Separation of Concerns**: UI logic riêng, business logic riêng
4. **Type Safety**: Sử dụng TypeScript cho tất cả code mới
5. **Consistent Naming**: Tuân thủ naming conventions
6. **Documentation**: Comment cho logic phức tạp
7. **Testing**: Test cho critical functions

## 🎯 Next Steps

- [ ] Migrate existing code sang structure mới
- [ ] Setup path aliases
- [ ] Tạo common components
- [ ] Tạo API services
- [ ] Setup Zustand store
- [ ] Create feature modules
- [ ] Add tests
- [ ] Setup CI/CD

---

**Cấu trúc này giúp:**
- ✅ Dễ dàng tìm kiếm files
- ✅ Dễ dàng mở rộng features
- ✅ Team collaboration tốt hơn
- ✅ Maintainability cao
- ✅ Scalable cho dự án lớn
