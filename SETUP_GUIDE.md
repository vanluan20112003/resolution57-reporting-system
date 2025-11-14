# Hướng dẫn cài đặt môi trường - Cổng thông tin Nghị quyết 57

## Yêu cầu hệ thống

### Backend (Laravel)
- PHP >= 8.1
- Composer
- MySQL >= 8.0 hoặc PostgreSQL >= 13
- Nginx hoặc Apache

### Frontend (ReactJS)
- Node.js >= 18.x
- npm >= 9.x hoặc yarn >= 1.22

### Tools bổ sung
- Git
- Docker & Docker Compose (tùy chọn - để dễ dàng setup)

---

## Bước 1: Cài đặt PHP và Composer

### Windows:
1. Tải PHP từ https://windows.php.net/download/
2. Cài đặt Composer từ https://getcomposer.org/download/
3. Kiểm tra cài đặt:
```bash
php -v
composer -v
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install php8.2 php8.2-cli php8.2-common php8.2-mysql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-gd
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## Bước 2: Cài đặt Node.js và npm

### Windows:
1. Tải Node.js LTS từ https://nodejs.org/
2. Cài đặt và kiểm tra:
```bash
node -v
npm -v
```

### Linux (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Bước 3: Cài đặt MySQL

### Windows:
1. Tải MySQL từ https://dev.mysql.com/downloads/installer/
2. Cài đặt và ghi nhớ mật khẩu root

### Linux:
```bash
sudo apt install mysql-server
sudo mysql_secure_installation
```

---

## Bước 4: Clone và setup dự án

### 4.1. Cài đặt Laravel Backend

```bash
# Di chuyển vào thư mục dự án
cd d:\NQ57

# Cài đặt dependencies Laravel
composer install

# Copy file môi trường
copy .env.example .env

# Generate application key
php artisan key:generate

# Tạo database
# Trước tiên tạo database trong MySQL:
# CREATE DATABASE nq57_portal;

# Chỉnh sửa file .env với thông tin database của bạn
# DB_DATABASE=nq57_portal
# DB_USERNAME=root
# DB_PASSWORD=your_password

# Chạy migrations
php artisan migrate

# Chạy seeders (nếu có)
php artisan db:seed

# Tạo storage link
php artisan storage:link
```

### 4.2. Cài đặt ReactJS Frontend

```bash
# Di chuyển vào thư mục frontend (sẽ tạo sau)
cd resources/react

# Cài đặt dependencies
npm install

# Hoặc nếu dùng yarn
yarn install
```

---

## Bước 5: Chạy ứng dụng

### Development Mode

#### Terminal 1 - Laravel Backend:
```bash
php artisan serve
# Sẽ chạy tại: http://localhost:8000
```

#### Terminal 2 - ReactJS Frontend:
```bash
cd resources/react
npm run dev
# Hoặc: npm start
# Sẽ chạy tại: http://localhost:3000 hoặc http://localhost:5173
```

---

## Bước 6: Setup với Docker (Tùy chọn - Khuyến nghị)

Nếu bạn muốn dễ dàng hơn, sử dụng Docker:

```bash
# Cài đặt Docker Desktop (Windows) hoặc Docker Engine (Linux)

# Build và chạy containers
docker-compose up -d

# Cài đặt dependencies Laravel trong container
docker-compose exec app composer install

# Generate key
docker-compose exec app php artisan key:generate

# Chạy migrations
docker-compose exec app php artisan migrate

# Cài đặt dependencies frontend
docker-compose exec frontend npm install
```

---

## Cấu trúc thư mục dự án

```
NQ57/
├── app/                    # Laravel application code
├── bootstrap/
├── config/                 # Laravel config files
├── database/
│   ├── migrations/        # Database migrations
│   └── seeders/           # Database seeders
├── public/                # Public assets
├── resources/
│   ├── react/             # ReactJS frontend application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── App.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   └── views/             # Laravel Blade templates (minimal)
├── routes/
│   ├── api.php            # API routes
│   └── web.php            # Web routes
├── storage/
├── tests/
├── .env.example
├── composer.json
├── package.json
├── docker-compose.yml
└── README.md
```

---

## Troubleshooting

### Lỗi composer install
```bash
# Xóa cache và thử lại
composer clear-cache
composer install --ignore-platform-reqs
```

### Lỗi permission (Linux)
```bash
sudo chown -R $USER:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### Lỗi CORS khi gọi API
Đảm bảo đã cấu hình CORS trong Laravel:
- File: `config/cors.php`
- Middleware: `\Fruitcake\Cors\HandleCors::class`

---

## Tài liệu tham khảo

- Laravel: https://laravel.com/docs
- React: https://react.dev/
- Vite: https://vitejs.dev/
- Docker: https://docs.docker.com/
