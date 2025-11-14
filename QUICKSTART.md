# 🚀 QUICKSTART - NQ57 Portal

Hướng dẫn nhanh để chạy dự án lần đầu tiên!

## 🎯 Chọn 1 trong 2 cách:

---

## ⚡ Cách 1: Chạy trực tiếp (Không dùng Docker)

### Yêu cầu:
- ✅ PHP >= 8.1
- ✅ Composer
- ✅ Node.js >= 18
- ✅ MySQL >= 8.0

### Bước 1: Chạy script tự động

#### Windows:
```bash
start.bat
```

#### Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

### Bước 2: Tạo database

Mở MySQL và chạy:
```sql
CREATE DATABASE nq57_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Cấu hình .env

Mở file `.env` và chỉnh sửa thông tin database:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nq57_portal
DB_USERNAME=root
DB_PASSWORD=your_password
```

### Bước 4: Chạy migrations (nếu có)

```bash
php artisan migrate
```

### Bước 5: Chạy ứng dụng

Mở 2 terminals:

**Terminal 1 - Laravel:**
```bash
php artisan serve
```
→ Backend chạy tại: **http://localhost:8000**

**Terminal 2 - React:**
```bash
cd resources/react
npm run dev
```
→ Frontend chạy tại: **http://localhost:5000**

---

## 🐳 Cách 2: Chạy với Docker (Khuyến nghị - Dễ nhất!)

### Yêu cầu:
- ✅ Docker Desktop (Windows/Mac)
- ✅ Docker & Docker Compose (Linux)

### Bước 1: Chạy script Docker

#### Windows:
```bash
start-docker.bat
```

#### Linux/Mac:
```bash
chmod +x start-docker.sh
./start-docker.sh
```

### Bước 2: Đợi setup hoàn tất

Script sẽ tự động:
- ✅ Khởi động Docker containers
- ✅ Cài đặt Laravel dependencies
- ✅ Generate application key
- ✅ Cài đặt React dependencies

### Bước 3: Chạy migrations (nếu có)

```bash
docker-compose exec app php artisan migrate
```

### Bước 4: Truy cập ứng dụng

- 🌐 **Frontend (React)**: http://localhost:5000
- 🔧 **Backend (Laravel)**: http://localhost:8000
- 🗄️ **phpMyAdmin**: http://localhost:8080
- 💾 **MySQL**: localhost:3306

### Thông tin Database (Docker):
```
Database: nq57_portal
Username: nq57_user
Password: nq57_password
Root Password: root_password
```

---

## 📝 Lệnh Docker hữu ích

```bash
# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f app
docker-compose logs -f frontend

# Dừng containers
docker-compose down

# Restart containers
docker-compose restart

# Chạy artisan commands
docker-compose exec app php artisan [command]

# Truy cập vào container
docker-compose exec app bash
docker-compose exec frontend sh

# Rebuild containers
docker-compose up -d --build
```

---

## ✅ Kiểm tra

### 1. Kiểm tra Backend (Laravel):
Mở trình duyệt: **http://localhost:8000**

Bạn sẽ thấy:
```json
{
  "message": "Welcome to NQ57 Portal API",
  "version": "1.0.0",
  "status": "running"
}
```

### 2. Kiểm tra API:
**http://localhost:8000/api/v1/status**
```json
{
  "status": "success",
  "message": "NQ57 Portal API is running",
  "version": "1.0.0"
}
```

### 3. Kiểm tra Frontend (React):
Mở trình duyệt: **http://localhost:5000**

Bạn sẽ thấy trang chào mừng với header "Cổng thông tin Nghị quyết 57"

---

## 🐛 Troubleshooting

### Lỗi: Port 5000 đã được sử dụng

**Windows:**
```bash
# Tìm process đang dùng port 5000
netstat -ano | findstr :5000

# Kill process (thay PID bằng số từ lệnh trên)
taskkill /PID [PID] /F
```

**Linux/Mac:**
```bash
# Tìm và kill process
lsof -ti:5000 | xargs kill -9
```

### Lỗi: composer install failed

```bash
# Xóa cache và thử lại
composer clear-cache
composer install --ignore-platform-reqs
```

### Lỗi: npm install failed

```bash
cd resources/react
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Lỗi: Docker containers không start

```bash
# Dừng tất cả containers
docker-compose down

# Xóa volumes và rebuild
docker-compose down -v
docker-compose up -d --build
```

### Lỗi: Permission denied (Linux/Mac)

```bash
# Cấp quyền cho storage
chmod -R 775 storage bootstrap/cache
chown -R $USER:www-data storage bootstrap/cache

# Cấp quyền cho scripts
chmod +x start.sh start-docker.sh
```

---

## 🎉 Xong!

Bây giờ bạn đã có:
- ✅ Backend Laravel chạy trên **http://localhost:8000**
- ✅ Frontend React chạy trên **http://localhost:5000**
- ✅ API endpoints sẵn sàng
- ✅ Database đã được setup

### Bước tiếp theo:
1. Đọc [README.md](README.md) để hiểu cấu trúc project
2. Đọc [SETUP_GUIDE.md](SETUP_GUIDE.md) để biết chi tiết về setup
3. Bắt đầu phát triển tính năng!

---

## 💡 Tips

- Sử dụng **Docker** để dễ dàng setup và tránh conflict dependencies
- Luôn mở 2 terminals khi chạy không dùng Docker
- Check logs nếu có lỗi: `docker-compose logs -f`
- Sử dụng phpMyAdmin để quản lý database: http://localhost:8080

---

## 📞 Cần hỗ trợ?

- 📚 Xem [SETUP_GUIDE.md](SETUP_GUIDE.md)
- 📖 Xem [README.md](README.md)
- 🐛 Báo lỗi tại GitHub Issues
