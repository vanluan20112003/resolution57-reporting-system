# 🚀 NQ57 Portal - Frontend

Hệ thống Thông tin Giám sát, Đánh giá việc thực hiện Nghị quyết số 57-NQ/TW

## 📋 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Library**: Ant Design 5
- **Routing**: React Router 6
- **State Management**: Zustand (planned)
- **HTTP Client**: Axios
- **Date Library**: Day.js
- **Icons**: Ant Design Icons
- **Styling**: CSS Modules + CSS Variables

## 🎯 Features

- ✅ Authentication (SSO + Email/Password)
- ✅ Dashboard với giao diện trang nghiêm, chuyên nghiệp
- ✅ Quản lý Nghị quyết
- 🚧 Báo cáo & Thống kê
- 🚧 KPI Dashboard
- 🚧 Phân tích dữ liệu

## 📁 Cấu trúc Dự án

```
src/
├── api/              # API services
├── assets/           # Static assets
├── components/       # Reusable components
├── config/           # App configurations
├── constants/        # Constants (routes, messages, API)
├── contexts/         # React contexts
├── features/         # Feature modules
├── hooks/            # Custom hooks
├── layouts/          # Layout components
├── lib/              # Utilities & helpers
├── pages/            # Page components
├── services/         # Business logic
├── store/            # State management
├── styles/           # Global styles
├── types/            # TypeScript types
└── utils/            # Utility functions
```

Chi tiết: Xem [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ hoặc 20+
- npm 9+ hoặc yarn 1.22+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Design System

### Color Palette - Trang nghiêm & Chuyên nghiệp

- **Primary Blue**: `#1890ff` - Professional, trustworthy
- **NQ57 Red**: `#d32f2f` - Bold, important
- **Neutral Gray**: `#fafafa - #212121` - Clean, elegant

### Typography

- **Font Family**: System fonts (SF Pro, Segoe UI, Roboto)
- **Font Sizes**: 12px, 14px, 16px, 20px, 24px, 28px, 32px
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Spacing

- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **2XL**: 48px

### Shadows

- **SM**: Subtle shadow
- **MD**: Medium shadow (cards, buttons)
- **LG**: Large shadow (modals, dropdowns)
- **XL**: Extra large shadow (elevated elements)

## 🔧 Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=NQ57 Portal
VITE_APP_VERSION=1.0.0
```

### Path Aliases

```typescript
import { Button } from '@components'
import { useAuth } from '@hooks'
import { ROUTES } from '@constants'
import { authService } from '@services'
```

## 📚 Available Scripts

```bash
# Development
npm run dev          # Start dev server at localhost:5000

# Build
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors

# Type Check
npm run type-check   # Run TypeScript type checking
```

## 🎯 Key Features Explained

### 1. Authentication

- SSO với Keycloak
- Email/Password login
- Auto redirect dựa trên auth status
- Protected routes
- Token management

### 2. Dashboard

- **Sidebar**: Menu navigation với icons
- **Header**: User info, notifications
- **Content**: Dynamic content based on selected menu
- **Responsive**: Mobile-friendly design

### 3. Resolution List

- **Filters**: Search, category, issuer, date range
- **Table**: Professional table với sorting, pagination
- **Actions**: View, edit, delete
- **Export**: Export to Excel, PDF

## 🎨 CSS Architecture

### CSS Variables (Professional Design)

```css
:root {
  /* Colors */
  --primary-color: #1890ff;
  --red-primary: #d32f2f;
  --gray-50: #fafafa;

  /* Shadows */
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Spacing */
  --spacing-md: 16px;

  /* Transitions */
  --transition-base: 0.3s ease-in-out;
}
```

### Design Principles

1. **Trang nghiêm (Professional)**:
   - Clean lines & spaces
   - Subtle shadows
   - Professional color palette
   - Clear hierarchy

2. **Thoải mái (Comfortable)**:
   - Adequate spacing
   - Smooth transitions
   - Hover effects
   - Visual feedback

3. **Consistency**:
   - Consistent spacing
   - Consistent colors
   - Consistent typography
   - Consistent interactions

## 📖 Code Style Guide

### Naming Conventions

- **Components**: `PascalCase` (e.g., `DashboardPage.tsx`)
- **Hooks**: `camelCase` with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: `camelCase` (e.g., `formatDate.ts`)
- **Constants**: `UPPER_SNAKE_CASE` or `camelCase`
- **Types**: `PascalCase` with descriptive names

### Import Order

```typescript
// 1. External libraries
import React from 'react'
import { Button } from 'antd'

// 2. Internal absolute imports (with aliases)
import { useAuth } from '@hooks'
import { ROUTES } from '@constants'

// 3. Internal relative imports
import { Header } from './Header'
import styles from './styles.css'

// 4. Types
import type { User } from '@types'
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from 'antd'
import type { ButtonProps } from 'antd'

// 2. Types/Interfaces
interface MyComponentProps {
  title: string
  onSubmit: () => void
}

// 3. Component
function MyComponent({ title, onSubmit }: MyComponentProps) {
  // 3.1. Hooks
  const [loading, setLoading] = useState(false)

  // 3.2. Functions
  const handleClick = () => {
    setLoading(true)
    onSubmit()
  }

  // 3.3. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick} loading={loading}>
        Submit
      </Button>
    </div>
  )
}

// 4. Export
export default MyComponent
```

## 🔐 Authentication Flow

```
1. User visits app
2. Check localStorage for token
3. If no token → redirect to /login
4. If has token → redirect to /dashboard
5. User logs in → save token → redirect to /dashboard
6. User logs out → clear token → redirect to /login
```

## 🚧 Roadmap

### Phase 1: Foundation ✅
- [x] Setup project structure
- [x] Create Login page
- [x] Create Dashboard layout
- [x] Professional CSS design
- [x] Constants & configurations

### Phase 2: Core Features (In Progress)
- [ ] API integration
- [ ] Zustand state management
- [ ] CRUD operations for Resolutions
- [ ] Advanced filters & search
- [ ] Export functionality

### Phase 3: Advanced Features
- [ ] Reports & Analytics
- [ ] KPI Dashboard
- [ ] Real-time notifications
- [ ] File upload
- [ ] Charts & graphs

### Phase 4: Polish
- [ ] Unit tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

## 🤝 Contributing

1. Clone repository
2. Create feature branch: `git checkout -b feature/feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/feature-name`
5. Create Pull Request

## 📄 License

MIT License - Xem [LICENSE](../../LICENSE)

## 👥 Team

- **Developer**: Luan
- **Organization**: ĐHQG TP.HCM

---

**Happy Coding! 🚀**
