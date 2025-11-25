# 🚀 Hướng dẫn Cài đặt Nhanh NQ57 Portal với Docker (Windows)

> **Cài đặt hoàn chỉnh chỉ trong 15-20 phút!**

## 📋 Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Bước 1: Cài đặt Docker Desktop](#bước-1-cài-đặt-docker-desktop)
4. [Bước 2: Cài đặt Git](#bước-2-cài-đặt-git)
5. [Bước 3: Clone và Cấu hình Project](#bước-3-clone-và-cấu-hình-project)
6. [Bước 4: Khởi động ứng dụng](#bước-4-khởi-động-ứng-dụng)
7. [Bước 5: Truy cập ứng dụng](#bước-5-truy-cập-ứng-dụng)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Giới thiệu

Hướng dẫn này giúp bạn cài đặt **NQ57 Portal** trên Windows bằng Docker - **KHÔNG CÀI PHP, MySQL, Node.js thủ công**!

### Tại sao dùng Docker?
- ✅ Cài đặt siêu nhanh (15-20 phút)
- ✅ Không cần cài PHP, Composer, MySQL, Node.js thủ công
- ✅ Môi trường đồng nhất trên mọi máy
- ✅ Dễ dàng xóa bỏ hoàn toàn (chỉ cần xóa containers)
- ✅ Phù hợp cho cả Development và Production

---

## ⚙️ Yêu cầu hệ thống

### Yêu cầu phần cứng:
- **OS**: Windows 10 64-bit (Pro, Enterprise, Education) hoặc Windows 11
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB)
- **Disk**: Tối thiểu 10GB trống
- **CPU**: Hỗ trợ ảo hóa (Intel VT-x hoặc AMD-V)

### Yêu cầu phần mềm:
- Windows 10/11 với WSL 2 (Windows Subsystem for Linux)
- Docker Desktop for Windows
- Git for Windows

### Kiểm tra WSL 2:
```powershell
# Mở PowerShell và chạy:
wsl --status
```

Nếu chưa có WSL 2, xem [Bước 1.1](#11-cài-đặt-wsl-2-nếu-chưa-có)

---

## 🐳 Bước 1: Cài đặt Docker Desktop

### 1.1. Cài đặt WSL 2 (nếu chưa có)

**Mở PowerShell với quyền Administrator:**

```powershell
# Cài đặt WSL 2
wsl --install

# Hoặc nếu đã có WSL 1, upgrade lên WSL 2:
wsl --set-default-version 2
```

**Khởi động lại máy tính sau khi cài xong!**

**Sau khi khởi động lại, mở PowerShell:**
```powershell
# Kiểm tra WSL đã cài thành công
wsl --version
wsl --status
```

### 1.2. Download Docker Desktop

1. Truy cập: https://www.docker.com/products/docker-desktop/
2. Click **Download for Windows**
3. Download file: `Docker Desktop Installer.exe`

### 1.3. Cài đặt Docker Desktop

1. Chạy file **Docker Desktop Installer.exe**
2. Trong quá trình cài đặt:
   - ✅ **Use WSL 2 instead of Hyper-V** (Đảm bảo option này được chọn)
   - ✅ **Add shortcut to desktop** (Tùy chọn)
3. Click **OK** → Chờ cài đặt (3-5 phút)
4. Click **Close and restart** để khởi động lại máy

### 1.4. Khởi động Docker Desktop

1. Sau khi khởi động lại, mở **Docker Desktop** từ Start Menu
2. Chờ Docker khởi động (biểu tượng Docker ở System Tray sẽ chuyển sang màu xanh)
3. Khi thấy "Docker Desktop is running", bạn đã sẵn sàng!

### 1.5. Kiểm tra Docker

**Mở Command Prompt hoặc PowerShell:**

```cmd
docker --version
```
Kết quả: `Docker version 24.x.x, build xxxxx`

```cmd
docker compose version
```
Kết quả: `Docker Compose version v2.x.x`

```cmd
docker run hello-world
```
Kết quả: `Hello from Docker!`

**✅ Nếu thấy 3 lệnh trên chạy thành công, Docker đã sẵn sàng!**

---

## 📥 Bước 2: Cài đặt Git

### 2.1. Download Git for Windows

1. Truy cập: https://git-scm.com/download/win
2. Download **64-bit Git for Windows Setup**
3. Chạy file cài đặt
4. Giữ nguyên các thiết lập mặc định → Click **Next** → **Install**

### 2.2. Kiểm tra Git

```cmd
git --version
```
Kết quả: `git version 2.x.x.windows.x`

---

## 🔧 Bước 3: Clone và Cấu hình Project

### 3.1. Chọn thư mục làm việc

```cmd
# Mở Command Prompt (CMD)
# Tạo thư mục project (ví dụ: trên ổ D)
mkdir D:\Projects
cd D:\Projects
```

### 3.2. Clone Repository

```cmd
# Clone project từ GitHub
git clone https://github.com/vanluan20112003/resolution57-reporting-system.git NQ57

# Di chuyển vào thư mục project
cd NQ57

# Kiểm tra code đã clone
dir
```

### 3.3. Tạo file .env

```cmd
# Copy file .env từ template
copy .env.example .env
```

### 3.4. Chỉnh sửa file .env

**Mở file .env bằng Notepad:**
```cmd
notepad .env
```

**QUAN TRỌNG: Thay đổi các dòng sau:**

```env
APP_NAME="NQ57 Portal"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database - PHẢI GIỐNG với docker-compose.yml
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=nq57_portal
DB_USERNAME=nq57_user
DB_PASSWORD=nq57_password

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis

# Frontend URL
FRONTEND_URL=http://localhost:5000

# CORS
CORS_ALLOWED_ORIGINS="http://localhost:5000,http://localhost:3000,http://localhost:8000"
```

**Lưu ý quan trọng:**
- `DB_HOST=mysql` (KHÔNG PHẢI `127.0.0.1` hay `localhost`)
- `REDIS_HOST=redis` (KHÔNG PHẢI `127.0.0.1`)
- Đây là tên service trong Docker Compose

**Lưu file:** `Ctrl + S` và đóng Notepad

### 3.5. Kiểm tra file docker-compose.yml

```cmd
notepad docker-compose.yml
```

**Đảm bảo passwords trong docker-compose.yml khớp với .env:**

```yaml
mysql:
  environment:
    MYSQL_DATABASE: nq57_portal
    MYSQL_ROOT_PASSWORD: root_password
    MYSQL_USER: nq57_user
    MYSQL_PASSWORD: nq57_password  # Phải giống DB_PASSWORD trong .env
```

**Nếu muốn đổi password:**
1. Đổi trong `.env`: `DB_PASSWORD=your_new_password`
2. Đổi trong `docker-compose.yml`: `MYSQL_PASSWORD: your_new_password`

**Lưu file nếu có thay đổi**

---

## 🚀 Bước 4: Khởi động ứng dụng

### 4.1. Khởi động Docker Desktop

**Đảm bảo Docker Desktop đang chạy:**
- Xem biểu tượng Docker ở System Tray (góc dưới bên phải)
- Icon Docker phải màu xanh và hiển thị "Docker Desktop is running"

**Nếu Docker chưa chạy:**
```cmd
# Khởi động Docker Desktop
"C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Chờ 30 giây để Docker khởi động hoàn toàn
timeout /t 30 /nobreak
```

### 4.2. Build và Start Containers

**Mở Command Prompt tại thư mục project:**

```cmd
cd D:\Projects\NQ57

# Build và start tất cả services
docker compose up -d --build
```

**Quá trình này sẽ:**
- Download các Docker images (PHP, MySQL, Redis, Node.js, Nginx)
- Build custom images cho app và frontend
- Khởi động tất cả containers
- **Thời gian: 5-10 phút lần đầu** (tùy tốc độ mạng)

**Kết quả khi thành công:**
```
[+] Building 120.5s (30/30) FINISHED
[+] Running 6/6
 ✔ Network nq57-network          Created
 ✔ Container nq57_mysql           Started
 ✔ Container nq57_redis           Started
 ✔ Container nq57_app             Started
 ✔ Container nq57_nginx           Started
 ✔ Container nq57_frontend        Started
```

### 4.3. Kiểm tra Containers đang chạy

```cmd
docker compose ps
```

**Tất cả containers phải có STATE là "Up":**
```
NAME               SERVICE    STATUS
nq57_app           app        Up
nq57_frontend      frontend   Up
nq57_mysql         mysql      Up (healthy)
nq57_nginx         nginx      Up
nq57_redis         redis      Up
```

**Nếu có container bị lỗi (Exit hoặc Restarting):**
```cmd
# Xem logs của container bị lỗi
docker compose logs app
docker compose logs frontend
docker compose logs mysql
```

### 4.4. Cài đặt Laravel Dependencies

**Chờ containers khởi động hoàn toàn (khoảng 30 giây), sau đó:**

```cmd
# Install Composer dependencies
docker compose exec app composer install

# Generate application key
docker compose exec app php artisan key:generate

# Run migrations
docker compose exec app php artisan migrate

# Seed database (optional)
docker compose exec app php artisan db:seed

# Cache configuration
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache

# Set permissions
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
```

**Lưu ý:**
- Lệnh `composer install` có thể mất 3-5 phút
- Nếu gặp lỗi "container is not running", chờ thêm vài giây và thử lại

### 4.5. Cài đặt Frontend Dependencies

```cmd
# Install npm packages (có thể mất 3-5 phút)
docker compose exec frontend npm install
```

**Sau khi xong, frontend sẽ tự động build và chạy!**

---

## 🌐 Bước 5: Truy cập ứng dụng

### 5.1. Mở trình duyệt

**Truy cập các URL sau:**

1. **Frontend (React):** http://localhost:5000
2. **Backend API:** http://localhost:8000/api/v1/status
3. **phpMyAdmin (quản lý database):** http://localhost:8080

**Thông tin đăng nhập phpMyAdmin:**
- Server: `mysql`
- Username: `root`
- Password: `root_password`

### 5.2. Kiểm tra hoạt động

**Test Backend API:**
```cmd
curl http://localhost:8000/api/v1/status
```

**Kết quả mong đợi (JSON):**
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2024-01-24T10:00:00.000000Z"
}
```

**Test Frontend:**
```cmd
curl http://localhost:5000
```

**Kết quả:** HTML của React app

**✅ Nếu thấy giao diện React và API trả về JSON, cài đặt đã thành công! 🎉**

---

## 📚 Các lệnh Docker thường dùng

### Quản lý Containers

```cmd
# Xem tất cả containers đang chạy
docker compose ps

# Xem logs (realtime)
docker compose logs -f

# Xem logs của service cụ thể
docker compose logs -f app
docker compose logs -f frontend
docker compose logs -f mysql

# Start containers (đã build rồi)
docker compose up -d

# Stop containers (không xóa)
docker compose stop

# Stop và xóa containers
docker compose down

# Stop, xóa containers VÀ xóa volumes (database)
docker compose down -v

# Restart containers
docker compose restart

# Restart service cụ thể
docker compose restart app
docker compose restart frontend
```

### Chạy lệnh trong Container

```cmd
# Truy cập vào container (bash)
docker compose exec app bash
docker compose exec frontend sh

# Chạy lệnh Laravel Artisan
docker compose exec app php artisan migrate
docker compose exec app php artisan cache:clear
docker compose exec app php artisan config:clear

# Chạy lệnh npm
docker compose exec frontend npm install
docker compose exec frontend npm run build

# Truy cập MySQL
docker compose exec mysql mysql -u nq57_user -p nq57_portal
# Nhập password: nq57_password
```

### Xem thông tin

```cmd
# Xem resource usage (CPU, RAM)
docker stats

# Xem networks
docker network ls

# Xem volumes
docker volume ls

# Xem images
docker images

# Xem chi tiết container
docker compose exec app php -v
docker compose exec app php -m
```

---

## 🔧 Troubleshooting

### ❌ Lỗi 1: "Docker Desktop is not running"

**Giải pháp:**
```cmd
# Khởi động Docker Desktop
"C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Chờ 30 giây
timeout /t 30 /nobreak

# Kiểm tra Docker đã chạy
docker info
```

### ❌ Lỗi 2: Port 8000, 5000, 3306 đã được sử dụng

**Tìm process đang dùng port:**
```cmd
netstat -ano | findstr :8000
netstat -ano | findstr :5000
netstat -ano | findstr :3306
```

**Kill process:**
```cmd
taskkill /PID <PID> /F
```

**Hoặc đổi port trong docker-compose.yml:**
```yaml
nginx:
  ports:
    - "8001:80"  # Đổi 8000 → 8001

frontend:
  ports:
    - "5001:5000"  # Đổi 5000 → 5001
```

### ❌ Lỗi 3: "Cannot connect to database"

**Kiểm tra MySQL container:**
```cmd
docker compose ps mysql
docker compose logs mysql
```

**Kiểm tra file .env:**
```env
DB_HOST=mysql        # Phải là "mysql", KHÔNG phải "127.0.0.1"
DB_DATABASE=nq57_portal
DB_USERNAME=nq57_user
DB_PASSWORD=nq57_password
```

**Restart containers:**
```cmd
docker compose down
docker compose up -d
```

**Test kết nối database:**
```cmd
docker compose exec mysql mysql -u nq57_user -p nq57_portal
# Nhập password: nq57_password
```

### ❌ Lỗi 4: Container bị Exit hoặc Restarting

**Xem logs để tìm nguyên nhân:**
```cmd
docker compose logs app
docker compose logs frontend
```

**Các nguyên nhân thường gặp:**

1. **App container Exit:**
   - Thiếu dependencies → Chạy: `docker compose exec app composer install`
   - File .env sai → Kiểm tra lại file .env

2. **Frontend container Exit:**
   - Thiếu node_modules → Chạy: `docker compose exec frontend npm install`
   - Port conflict → Đổi port trong docker-compose.yml

3. **MySQL container Exit:**
   - Thiếu RAM → Tắt các ứng dụng khác
   - Port conflict → Đổi port 3306 sang port khác

**Rebuild lại từ đầu:**
```cmd
docker compose down -v
docker compose up -d --build --force-recreate
```

### ❌ Lỗi 5: "Permission denied" trong container

**Fix permissions:**
```cmd
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
docker compose exec app chmod -R 775 storage bootstrap/cache
```

### ❌ Lỗi 6: Docker build quá chậm

**Nguyên nhân:** Mạng chậm khi download images

**Giải pháp:**
1. Kiểm tra kết nối Internet
2. Chờ thêm thời gian (lần đầu có thể mất 10-15 phút)
3. Hoặc dùng Docker mirror (nếu ở Việt Nam):

```cmd
# Thêm mirror vào Docker Desktop
# Settings → Docker Engine → thêm:
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

### ❌ Lỗi 7: WSL 2 không hoạt động

**Kiểm tra virtualization:**
```powershell
# Mở PowerShell Administrator
systeminfo
```

Tìm dòng **Hyper-V Requirements**. Tất cả phải là **Yes**.

**Nếu không:**
1. Vào BIOS/UEFI
2. Bật Intel VT-x hoặc AMD-V
3. Khởi động lại máy

**Cài lại WSL 2:**
```powershell
wsl --unregister Ubuntu
wsl --install
```

---

## 🛑 Dừng và Xóa ứng dụng

### Dừng containers (giữ lại data)

```cmd
docker compose stop
```

### Xóa containers (giữ lại data)

```cmd
docker compose down
```

### Xóa containers VÀ database (xóa hoàn toàn)

```cmd
docker compose down -v
```

### Xóa images để giải phóng dung lượng

```cmd
# Xem images
docker images

# Xóa images của project
docker rmi nq57-app
docker rmi nq57-frontend

# Xóa tất cả unused images
docker image prune -a
```

---

## 🔄 Update code sau này

Khi có code mới từ GitHub:

```cmd
# Di chuyển vào thư mục project
cd D:\Projects\NQ57

# Pull code mới
git pull origin main

# Rebuild và restart containers
docker compose down
docker compose up -d --build

# Update dependencies
docker compose exec app composer install
docker compose exec app php artisan migrate --force
docker compose exec app php artisan config:cache

docker compose exec frontend npm install
```

---

## 📊 So sánh Docker vs Cài đặt thủ công

| Tiêu chí | Docker | Cài đặt thủ công |
|----------|--------|------------------|
| **Thời gian cài đặt** | 15-20 phút | 1-2 giờ |
| **Độ phức tạp** | Dễ (3 bước) | Khó (9 bước) |
| **Cài PHP/MySQL** | Không cần | Phải cài |
| **Cấu hình** | Tự động | Thủ công |
| **Môi trường** | Đồng nhất | Khác nhau mỗi máy |
| **Xóa bỏ** | 1 lệnh | Phải gỡ từng phần mềm |
| **Dung lượng** | ~2-3GB | ~1-2GB |
| **Production-ready** | ✅ Có | ❌ Không |

---

## 🎯 Tóm tắt các bước

### Lần đầu cài đặt (15-20 phút):

1. **Cài Docker Desktop** (5 phút)
2. **Cài Git** (2 phút)
3. **Clone project** (1 phút)
4. **Cấu hình .env** (2 phút)
5. **Chạy `docker compose up -d --build`** (5-10 phút)
6. **Install dependencies** (3-5 phút)
7. **Truy cập http://localhost:5000** ✅

### Mỗi lần chạy sau này (30 giây):

1. Khởi động Docker Desktop
2. Chạy: `docker compose up -d`
3. Truy cập: http://localhost:5000

### Dừng ứng dụng (5 giây):

```cmd
docker compose stop
```

---

## 🎓 Học thêm về Docker

### Tài nguyên hữu ích:
- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Docker Hub: https://hub.docker.com/
- Laravel Docker: https://laravel.com/docs/10.x/sail

### Video tutorials:
- Docker cho người mới: https://www.youtube.com/watch?v=3c-iBn73dDE
- Docker Compose: https://www.youtube.com/watch?v=Qw9zlE3t8Ko

---

## ✅ Checklist Cài đặt

- [ ] Cài đặt WSL 2
- [ ] Cài đặt Docker Desktop
- [ ] Kiểm tra `docker --version` thành công
- [ ] Kiểm tra `docker compose version` thành công
- [ ] Cài đặt Git
- [ ] Clone repository từ GitHub
- [ ] Tạo và cấu hình file `.env`
- [ ] Kiểm tra `docker-compose.yml`
- [ ] Chạy `docker compose up -d --build`
- [ ] Kiểm tra `docker compose ps` - tất cả containers Up
- [ ] Chạy `composer install` trong container
- [ ] Chạy `php artisan migrate`
- [ ] Chạy `npm install` trong container frontend
- [ ] Truy cập http://localhost:5000 thành công
- [ ] Truy cập http://localhost:8000/api/v1/status thành công

---

## 🎉 Hoàn thành!

Bạn đã cài đặt thành công **NQ57 Portal** bằng Docker!

**Ứng dụng của bạn:**
- ✅ Backend API: http://localhost:8000
- ✅ Frontend: http://localhost:5000
- ✅ phpMyAdmin: http://localhost:8080
- ✅ MySQL: localhost:3306
- ✅ Redis: localhost:6379

**Để chạy lại ứng dụng:**
```cmd
cd D:\Projects\NQ57
docker compose up -d
```

**Để dừng:**
```cmd
docker compose stop
```

**Chúc bạn phát triển thành công! 🚀**

---

*Tài liệu này được tạo cho dự án NQ57 Portal - Cổng thông tin Nghị quyết 57*
*Quick Start with Docker Compose for Windows v1.0*
