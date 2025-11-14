# Cổng Thông Tin Nghị Quyết 57

Hệ thống cổng thông tin tổng hợp các hoạt động được cấp trên đưa ra dựa trên Nghị quyết 57.

## Công nghệ sử dụng

### Backend
- **Laravel 10** - PHP Framework
- **MySQL 8.0** - Database
- **Laravel Sanctum** - API Authentication
- **Spatie Permissions** - Role & Permission Management

### Frontend
- **React 18** - UI Library
- **Vite** - Build Tool
- **Ant Design** - UI Component Library
- **React Router** - Routing
- **Axios** - HTTP Client
- **Zustand** - State Management
- **React Query** - Data Fetching & Caching

## Yêu cầu hệ thống

- PHP >= 8.1
- Composer
- Node.js >= 18.x
- MySQL >= 8.0
- npm hoặc yarn

## Hướng dẫn cài đặt nhanh

### 1. Clone project và cài đặt dependencies

```bash
cd d:\NQ57

# Cài đặt Laravel dependencies
composer install

# Cài đặt React dependencies
cd resources/react
npm install
cd ../..
```

### 2. Cấu hình môi trường

```bash
# Copy file .env
copy .env.example .env

# Generate application key
php artisan key:generate

# Chỉnh sửa file .env với thông tin database của bạn
# DB_DATABASE=nq57_portal
# DB_USERNAME=root
# DB_PASSWORD=your_password
```

### 3. Tạo database và chạy migrations

```sql
-- Trong MySQL
CREATE DATABASE nq57_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
# Chạy migrations
php artisan migrate

# Chạy seeders (nếu có)
php artisan db:seed
```

### 4. Cấu hình React frontend

```bash
cd resources/react

# Copy file .env cho React
copy .env.example .env

# File .env sẽ có nội dung:
# VITE_API_URL=http://localhost:8000/api
```

### 5. Chạy ứng dụng

#### Mở 2 terminals:

**Terminal 1 - Laravel Backend:**
```bash
php artisan serve
# Chạy tại: http://localhost:8000
```

**Terminal 2 - React Frontend:**
```bash
cd resources/react
npm run dev
# Chạy tại: http://localhost:5173
```

## Cài đặt với Docker (Khuyến nghị)

```bash
# Build và chạy containers
docker-compose up -d

# Cài đặt Laravel dependencies
docker-compose exec app composer install

# Generate application key
docker-compose exec app php artisan key:generate

# Chạy migrations
docker-compose exec app php artisan migrate

# Cài đặt React dependencies
docker-compose exec frontend npm install
```

### Dịch vụ Docker:
- **Backend (Laravel)**: http://localhost:8000
- **Frontend (React)**: http://localhost:5173
- **MySQL**: localhost:3306
- **phpMyAdmin**: http://localhost:8080
- **Redis**: localhost:6379

## Cấu trúc thư mục

```
NQ57/
├── app/                          # Laravel application
│   ├── Http/
│   │   ├── Controllers/          # API Controllers
│   │   ├── Middleware/
│   │   └── Requests/             # Form Requests
│   ├── Models/                   # Eloquent Models
│   └── Services/                 # Business Logic
├── config/                       # Laravel configurations
├── database/
│   ├── migrations/               # Database migrations
│   └── seeders/                  # Database seeders
├── resources/
│   └── react/                    # React Frontend
│       ├── src/
│       │   ├── components/       # React Components
│       │   ├── pages/            # Page Components
│       │   ├── services/         # API Services
│       │   ├── store/            # State Management
│       │   ├── utils/            # Utilities
│       │   ├── hooks/            # Custom Hooks
│       │   ├── App.jsx           # Main App Component
│       │   └── main.jsx          # Entry Point
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
├── routes/
│   ├── api.php                   # API Routes
│   └── web.php                   # Web Routes
├── .env.example
├── composer.json
├── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/user` - Lấy thông tin user hiện tại

### Hoạt động (Activities)
- `GET /api/activities` - Danh sách hoạt động
- `POST /api/activities` - Tạo hoạt động mới
- `GET /api/activities/{id}` - Chi tiết hoạt động
- `PUT /api/activities/{id}` - Cập nhật hoạt động
- `DELETE /api/activities/{id}` - Xóa hoạt động

## Scripts hữu ích

### Laravel
```bash
# Xóa cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Tạo controller
php artisan make:controller ActivityController --api

# Tạo model với migration
php artisan make:model Activity -m

# Tạo migration
php artisan make:migration create_activities_table

# Chạy tests
php artisan test
```

### React
```bash
# Build production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Troubleshooting

### Lỗi composer install
```bash
composer clear-cache
composer install --ignore-platform-reqs
```

### Lỗi permission (Linux/Mac)
```bash
chmod -R 775 storage bootstrap/cache
```

### Lỗi CORS
Kiểm tra file `config/cors.php` và đảm bảo frontend URL được thêm vào allowed origins.

## Tài liệu chi tiết

Xem file [SETUP_GUIDE.md](SETUP_GUIDE.md) để có hướng dẫn chi tiết hơn.

## License

MIT License

## Liên hệ

- Email: admin@nq57.gov.vn
- Website: https://nq57.gov.vn
