# 🚀 Hướng dẫn Deploy NQ57 Portal lên Ubuntu Server

> **Repository GitHub**: https://github.com/vanluan20112003/resolution57-reporting-system.git

## 📋 Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Bước 0: Kết nối SSH vào Server](#bước-0-kết-nối-ssh-vào-server)
4. [Bước 1: Chuẩn bị Server](#bước-1-chuẩn-bị-server)
5. [Bước 2: Cài đặt Docker & Docker Compose](#bước-2-cài-đặt-docker--docker-compose)
6. [Bước 3: Clone Repository từ GitHub](#bước-3-clone-repository-từ-github)
7. [Bước 4: Cấu hình môi trường](#bước-4-cấu-hình-môi-trường)
8. [Bước 5: Khởi động ứng dụng](#bước-5-khởi-động-ứng-dụng)
9. [Bước 6: Cấu hình Nginx](#bước-6-cấu-hình-nginx)
10. [Bước 7: Cài đặt SSL](#bước-7-cài-đặt-ssl)
11. [Bước 8: Bảo mật](#bước-8-bảo-mật)
12. [Bước 9: Backup & Monitoring](#bước-9-backup--monitoring)

---

## 📖 Giới thiệu

Hướng dẫn này sẽ giúp bạn deploy **NQ57 Portal** (Laravel + React + Docker) lên Ubuntu Server từ đầu đến cuối.

**Tech Stack:**
- Backend: Laravel 10 + PHP 8.1
- Frontend: React 18 + Vite
- Database: MySQL 8.0
- Cache: Redis
- Container: Docker + Docker Compose
- Web Server: Nginx
- Authentication: Email/Password + Google OAuth

**Tính năng:**
- ✅ Đăng nhập bằng email/password
- ✅ Đăng nhập bằng Google OAuth (chỉ @vnuhcm.edu.vn)
- ✅ User dropdown với avatar
- ✅ Đa ngôn ngữ (Tiếng Việt/English)
- ✅ API endpoints tập trung

---

## ⚙️ Yêu cầu hệ thống

### Server Requirements:
- **OS**: Ubuntu 20.04 LTS hoặc 22.04 LTS
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **Disk**: Tối thiểu 20GB
- **CPU**: 2 cores
- **Domain**: (Optional) Nếu có domain name
- **Network**: Public IP address

### Thông tin bạn cần có:
- IP address của server (ví dụ: `123.456.789.0`)
- Username SSH (thường là `ubuntu` hoặc `root`)
- SSH password hoặc private key
- (Optional) Domain name đã trỏ về IP server

---

## 🔐 Bước 0: Kết nối SSH vào Server

### 0.1. Từ máy Windows (dùng PowerShell hoặc CMD)
```bash
ssh ubuntu@your-server-ip
# Ví dụ: ssh ubuntu@123.456.789.0

# Hoặc nếu dùng private key:
ssh -i path/to/your-key.pem ubuntu@your-server-ip
```

### 0.2. Từ máy Linux/Mac
```bash
ssh ubuntu@your-server-ip
# Nhập password khi được yêu cầu
```

### 0.3. Kiểm tra kết nối thành công
Sau khi SSH thành công, bạn sẽ thấy prompt:
```
ubuntu@nq57:~$
```

**Lưu ý**: Tất cả các lệnh dưới đây đều chạy trên server Ubuntu sau khi SSH vào!

---

## 🖥️ Bước 1: Chuẩn bị Server

### 1.1. Update hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2. Cài đặt các công cụ cơ bản
```bash
sudo apt install -y curl wget git vim nano unzip
```

### 1.3. Cấu hình Firewall
```bash
# Cài đặt UFW nếu chưa có
sudo apt install ufw -y

# Cho phép SSH (QUAN TRỌNG - làm trước để không bị khóa)
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bật firewall
sudo ufw --force enable

# Kiểm tra status
sudo ufw status
```

---

## 🐳 Bước 2: Cài đặt Docker & Docker Compose

### 2.1. Gỡ các version Docker cũ (nếu có)
```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

### 2.2. Cài đặt Docker
```bash
# Cài đặt các dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update và cài Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Kiểm tra version
docker --version
```

### 2.3. Cấu hình Docker
```bash
# Thêm user vào group docker (thay 'ubuntu' bằng username của bạn)
sudo usermod -aG docker $USER

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker

# Log out và log in lại để áp dụng group changes
exit
# SSH lại vào server
```

### 2.4. Kiểm tra Docker
```bash
# Test Docker
docker run hello-world

# Kiểm tra Docker Compose
docker compose version
```

---

## 📥 Bước 3: Clone Repository từ GitHub

### 3.1. Tạo thư mục project
```bash
# Tạo thư mục /var/www nếu chưa có
sudo mkdir -p /var/www

# Gán quyền sở hữu cho user hiện tại (thay ubuntu bằng username của bạn)
sudo chown -R $USER:$USER /var/www

# Kiểm tra quyền
ls -la /var/www
```

### 3.2. Clone repository từ GitHub
```bash
# Di chuyển vào thư mục /var/www
cd /var/www

# Clone repository
git clone https://github.com/vanluan20112003/resolution57-reporting-system.git nq57

# Di chuyển vào thư mục project
cd nq57

# Kiểm tra code đã clone thành công
ls -la
```

**Kết quả**: Bạn sẽ thấy các thư mục và file như:
```
app/
config/
database/
docker/
resources/
.env.example
composer.json
docker-compose.yml
...
```

---

## ⚙️ Bước 4: Cấu hình môi trường

### 4.1. Cấu hình API Endpoints (QUAN TRỌNG!)

**Dự án đã tập trung hóa tất cả API URLs vào 1 file:**
- **Frontend**: `resources/react/src/config/api.ts`
- **Backend**: Sử dụng `.env` variables

#### 4.1.1. Cấu hình Frontend (.env cho React)

```bash
cd /var/www/nq57/resources/react

# Tạo file .env cho production
nano .env
```

**Paste nội dung sau** (thay `your-domain.com` hoặc `your-ip`):

**Với Domain:**
```env
VITE_API_URL=/api/v1
VITE_FRONTEND_URL=https://nq57.vnuhcm.edu.vn
```

**Với IP (không có domain):**
```env
VITE_API_URL=/api/v1
VITE_FRONTEND_URL=http://123.456.789.0
```

**Lưu file**: `Ctrl + O`, Enter, `Ctrl + X`

> **Giải thích:**
> - `VITE_API_URL=/api/v1` - Sử dụng relative path để tránh CORS
> - `VITE_FRONTEND_URL` - URL frontend của bạn

---

### 4.2. Cấu hình file .env cho Laravel (Backend)
```bash
# Đảm bảo bạn đang ở trong thư mục /var/www/nq57
pwd
# Kết quả phải là: /var/www/nq57

# Copy file .env từ template
cp .env.example .env

# Mở file .env để chỉnh sửa
nano .env
```

**Các thay đổi QUAN TRỌNG trong `.env`:**

> **Lưu ý**: Thay `your-server-ip-or-domain` bằng IP hoặc domain thực của bạn!
> Ví dụ: `123.456.789.0` hoặc `nq57.example.com`
```env
APP_NAME="NQ57 Portal"
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-server-ip-or-domain

# Database - ĐỔI PASSWORD MẠNH!
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=nq57_portal
DB_USERNAME=nq57_user
DB_PASSWORD=your_strong_password_here

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Frontend URL
FRONTEND_URL=http://your-server-ip-or-domain

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://your-server-ip-or-domain/api/v1/auth/google/callback

# CORS
CORS_ALLOWED_ORIGINS="http://your-server-ip-or-domain"
```

**Cấu hình Google OAuth:**

Để lấy `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Chọn **Application type**: Web application
6. Cấu hình:
   - **Authorized JavaScript origins**: `http://your-domain.com` (hoặc IP)
   - **Authorized redirect URIs**: `http://your-domain.com/api/v1/auth/google/callback`
7. Copy Client ID và Client Secret vào file `.env`

**Lưu ý về domain:**
- Nếu dùng SSL (https), thay tất cả `http://` thành `https://`
- `FRONTEND_URL` không cần port `:5000` khi đã cấu hình Nginx reverse proxy
```

**Cách chỉnh sửa trong nano:**
- Dùng mũi tên để di chuyển
- Sửa các giá trị cần thiết
- `Ctrl + O` để lưu
- Nhấn `Enter` để xác nhận tên file
- `Ctrl + X` để thoát

### 4.2. Chỉnh sửa docker-compose.yml (BẢO MẬT - QUAN TRỌNG!)
```bash
nano docker-compose.yml
```

**Thay đổi passwords trong file:**
```yaml
# Tìm phần mysql service và đổi passwords
mysql:
  environment:
    MYSQL_ROOT_PASSWORD: your_strong_root_password
    MYSQL_PASSWORD: your_strong_password_here  # phải giống DB_PASSWORD trong .env
```

**QUAN TRỌNG**: Comment hoặc xóa service `phpmyadmin` trên production:
```yaml
# Tìm phần phpmyadmin (từ dòng 87-101)
# Thêm # trước mỗi dòng để comment:

  # phpmyadmin:
  #   image: phpmyadmin/phpmyadmin
  #   container_name: nq57_phpmyadmin
  #   restart: unless-stopped
  #   ports:
  #     - "8080:80"
  #   environment:
  #     PMA_HOST: mysql
  #     PMA_PORT: 3306
  #     PMA_USER: root
  #     PMA_PASSWORD: root_password
  #   networks:
  #     - nq57-network
  #   depends_on:
  #     - mysql
```

**Lưu file**: `Ctrl + O`, Enter, `Ctrl + X`

### 4.3. Tạo thư mục cần thiết và set permissions
```bash
# Tạo các thư mục storage
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Set permissions
chmod -R 775 storage bootstrap/cache
```

---

## 🚀 Bước 5: Khởi động ứng dụng

### 5.1. Build và start Docker containers
```bash
# Build và start tất cả services
docker compose up -d --build

# Xem logs để kiểm tra
docker compose logs -f
```

**Chờ khoảng 2-3 phút để containers khởi động hoàn tất**

**Kết quả**: Bạn sẽ thấy các containers được tạo:
```
[+] Building ...
[+] Running 6/6
 ✔ Network nq57-network      Created
 ✔ Container nq57_mysql       Started
 ✔ Container nq57_redis       Started
 ✔ Container nq57_app         Started
 ✔ Container nq57_nginx       Started
 ✔ Container nq57_frontend    Started
```

### 5.2. Kiểm tra containers đang chạy
```bash
# Xem tất cả containers
docker compose ps

# Xem logs nếu có lỗi
docker compose logs -f
# Nhấn Ctrl+C để thoát logs
```

**Tất cả containers phải có status "Up"**

### 5.3. Cài đặt Laravel dependencies
```bash
# Install Composer dependencies
docker compose exec app composer install --no-dev --optimize-autoloader

# Generate application key
docker compose exec app php artisan key:generate

# Run migrations
docker compose exec app php artisan migrate --force

# Cache configuration
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache

# Create test accounts (DEVELOPMENT ONLY)
docker compose exec app php artisan db:seed --class=UserSeeder

# Set permissions lại
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
```

**Lưu ý**: Lệnh `composer install` có thể mất 3-5 phút. Hãy kiên nhẫn!

#### 5.3.1. Tài khoản test đã được tạo

Sau khi chạy seeder, database sẽ có 2 tài khoản test:

| Email | Password | Role | Mô tả |
|-------|----------|------|-------|
| `long.nguyen@vnu-itp.edu.vn` | `123456` | ADMIN | Tài khoản admin test |
| `test@vnuhcm.edu.vn` | `password` | USER | Tài khoản user test |

⚠️ **QUAN TRỌNG**: Trong môi trường **PRODUCTION**, bạn nên:
1. Xóa hoặc đổi password các tài khoản test này
2. Hoặc comment phần seed trong deploy script
3. Tạo tài khoản admin thật qua database

**Xóa tài khoản test sau khi deploy:**
```bash
docker compose exec app php artisan tinker
# Trong tinker console:
User::where('email', 'long.nguyen@vnu-itp.edu.vn')->delete();
User::where('email', 'test@vnuhcm.edu.vn')->delete();
# Gõ exit để thoát
```

### 5.4. Cài đặt React dependencies
```bash
# Install npm packages (có thể mất vài phút)
docker compose exec frontend npm install

# Build production (nếu cần)
# docker compose exec frontend npm run build
```

### 5.5. Test ứng dụng từ server
```bash
# Test Backend API
curl http://localhost:8000/api/v1/status

# Test Frontend
curl http://localhost:5000

# Nếu thành công, bạn sẽ thấy response JSON hoặc HTML
```

**Nếu các lệnh trên trả về kết quả, ứng dụng đã chạy thành công!**

---

## 🌐 Bước 6: Cấu hình Nginx Reverse Proxy

### 6.1. Cài đặt Nginx trên host
```bash
sudo apt install nginx -y

# Kiểm tra Nginx đã cài thành công
nginx -v
```

### 6.2. Tạo file cấu hình Nginx
```bash
sudo nano /etc/nginx/sites-available/nq57
```

**Paste nội dung sau** (thay `your_domain.com` bằng domain hoặc IP của bạn):
```nginx
server {
    listen 80;
    server_name your_domain.com;  # Hoặc thay bằng IP: 123.456.789.0

    client_max_body_size 100M;

    # Frontend (React)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Laravel static files
    location /storage {
        proxy_pass http://localhost:8000;
    }
}
```

**Lưu file**: `Ctrl + O`, Enter, `Ctrl + X`

### 6.3. Enable site và restart Nginx
```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/nq57 /etc/nginx/sites-enabled/

# Xóa default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test cấu hình Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Kiểm tra status
sudo systemctl status nginx
# Nhấn 'q' để thoát
```

### 6.4. Test truy cập từ bên ngoài

**Từ máy local của bạn** (Windows/Mac), mở trình duyệt:
```
http://your-server-ip
http://your-server-ip/api/v1/status
```

**Nếu thấy giao diện hoặc API response, deploy đã thành công!**

---

## 🔒 Bước 7: Cài đặt SSL (HTTPS)

> **Lưu ý**: Chỉ làm bước này nếu bạn có domain name. Nếu chỉ dùng IP, bỏ qua bước 7!

### 7.1. Cài đặt Certbot (chỉ khi có domain)
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2. Tạo SSL certificate
```bash
# Thay your_domain.com bằng domain thực của bạn
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Làm theo hướng dẫn:
# - Nhập email
# - Đồng ý Terms of Service
# - Chọn redirect HTTP to HTTPS (option 2)
```

### 7.3. Test auto-renewal
```bash
sudo certbot renew --dry-run
```

**Sau khi cài SSL, truy cập**: `https://your_domain.com`

---

## 🔐 Bước 8: Bảo mật

### 8.1. Đổi SSH port (Optional - khuyến nghị cho production)
```bash
sudo nano /etc/ssh/sshd_config

# Tìm dòng: #Port 22
# Thay bằng: Port 2222  (hoặc port khác)

# Nhớ mở port mới trong firewall TRƯỚC KHI restart SSH!
sudo ufw allow 2222/tcp

# Restart SSH
sudo systemctl restart sshd

# Lần sau SSH vào dùng: ssh -p 2222 ubuntu@your-server-ip
```

⚠️ **CẢNH BÁO**: Nhớ mở port mới trước khi restart SSH, nếu không bạn sẽ bị khóa khỏi server!

### 8.2. Đóng các ports không cần thiết
```bash
# Xem các ports đang mở
sudo ufw status

# Chỉ nên mở: 22 (hoặc SSH port mới), 80, 443
# ĐÓNG các ports của Docker (3306, 6379, 8000, 8080, 5000)
# Vì đã có Nginx reverse proxy
```

### 8.3. Cấu hình Docker để chỉ bind localhost (BẢO MẬT)

**Chỉnh sửa `docker-compose.yml`:**
```bash
cd /var/www/nq57
nano docker-compose.yml
```

**Thay đổi ports mapping thành:**
```yaml
nginx:
  ports:
    - "127.0.0.1:8000:80"  # Chỉ bind localhost

mysql:
  ports:
    - "127.0.0.1:3306:3306"  # Chỉ bind localhost

redis:
  ports:
    - "127.0.0.1:6379:6379"  # Chỉ bind localhost

frontend:
  ports:
    - "127.0.0.1:5000:5000"  # Chỉ bind localhost
```

**Restart containers:**
```bash
docker compose down
docker compose up -d
```

---

## 💾 Bước 9: Backup & Monitoring

## 🔄 Bước 9.1: Tạo Script Deploy tự động

### 9.1.1. Tạo script deploy
```bash
cd /var/www/nq57
nano deploy.sh
```

**Paste nội dung sau vào file:**
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Rebuild containers if needed
echo "🐳 Rebuilding Docker containers..."
docker compose up -d --build

# Install/update dependencies
echo "📦 Installing Composer dependencies..."
docker compose exec -T app composer install --no-dev --optimize-autoloader

# Run migrations
echo "🗄️  Running database migrations..."
docker compose exec -T app php artisan migrate --force

# Seed database (chỉ lần đầu tiên - tạo tài khoản test)
echo "🌱 Seeding database..."
docker compose exec -T app php artisan db:seed --class=UserSeeder

# Clear and cache
echo "🧹 Clearing and caching..."
docker compose exec -T app php artisan config:cache
docker compose exec -T app php artisan route:cache
docker compose exec -T app php artisan view:cache

# Set permissions
echo "🔐 Setting permissions..."
docker compose exec -T app chown -R www-data:www-data storage bootstrap/cache

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
docker compose exec -T frontend npm install

echo "✅ Deployment completed!"
```

**Set executable:**
```bash
chmod +x /var/www/nq57/deploy.sh
```

### 9.1.2. Sử dụng script
```bash
cd /var/www/nq57
./deploy.sh
```

---

## 💾 Bước 9.2: Backup Database tự động

### 9.2.1. Tạo script backup
```bash
cd /var/www/nq57
mkdir -p backups
nano backup.sh
```

**Paste nội dung sau (nhớ thay `your_password` bằng password MySQL thật):**
```bash
#!/bin/bash

BACKUP_DIR="/var/www/nq57/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="nq57_backup_$DATE.sql"

echo "💾 Creating backup: $FILENAME"

docker compose exec -T mysql mysqldump -unq57_user -pyour_password nq57_portal > "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Xóa backup cũ hơn 7 ngày
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $FILENAME.gz"
```

**Set executable:**
```bash
chmod +x /var/www/nq57/backup.sh
```

### 9.2.2. Cấu hình Cron job (backup tự động hàng ngày)
```bash
# Mở crontab
crontab -e

# Chọn editor (thường chọn nano - số 1)
# Thêm dòng này vào cuối file (backup lúc 2 giờ sáng mỗi ngày):
0 2 * * * /var/www/nq57/backup.sh >> /var/www/nq57/backups/backup.log 2>&1

# Lưu và thoát: Ctrl+O, Enter, Ctrl+X
```

### 9.2.3. Test backup ngay
```bash
cd /var/www/nq57
./backup.sh

# Kiểm tra file backup
ls -lh backups/
```

### 9.2.4. Restore backup (khi cần)
```bash
# Giải nén backup
gunzip /var/www/nq57/backups/nq57_backup_YYYYMMDD_HHMMSS.sql.gz

# Restore vào database
docker compose exec -T mysql mysql -unq57_user -pyour_password nq57_portal < /var/www/nq57/backups/nq57_backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Bước 9.3: Monitoring & Logs

### 9.3.1. Xem logs
```bash
# Xem tất cả logs (realtime)
docker compose logs -f
# Nhấn Ctrl+C để thoát

# Xem logs của service cụ thể
docker compose logs -f app      # Laravel
docker compose logs -f frontend # React
docker compose logs -f nginx    # Nginx Docker
docker compose logs -f mysql    # MySQL

# Xem logs Nginx host (reverse proxy)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Xem 100 dòng logs cuối
docker compose logs --tail=100 app
```

### 9.3.2. Kiểm tra resource usage
```bash
# Xem Docker containers resource
docker stats

# Xem disk usage
df -h

# Xem memory usage
free -h

# Xem CPU usage
top
```

### 9.3.3. Health check & Testing
```bash
# Test API
curl http://localhost:8000/api/v1/status

# Test Frontend
curl http://localhost:5000

# Test qua Nginx
curl http://your_domain.com
curl http://your_domain.com/api/v1/status
```

---

## 🔧 Troubleshooting

### Vấn đề 1: Container không start
```bash
# Xem logs để tìm lỗi
docker compose logs app

# Restart container
docker compose restart app

# Rebuild từ đầu
docker compose down
docker compose up -d --build --force-recreate
```

### Vấn đề 2: Database connection error
```bash
# Kiểm tra MySQL container
docker compose exec mysql mysql -uroot -p
# Nhập root password

# Kiểm tra user và database
SHOW DATABASES;
SELECT user, host FROM mysql.user;

# Tạo lại user nếu cần
CREATE USER 'nq57_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON nq57_portal.* TO 'nq57_user'@'%';
FLUSH PRIVILEGES;
```

### Vấn đề 3: Permission denied
```bash
# Fix storage permissions
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
docker compose exec app chmod -R 775 storage bootstrap/cache
```

### Vấn đề 4: Port đã được sử dụng
```bash
# Tìm process đang dùng port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# Kill process (thay PID)
sudo kill -9 PID
```

### Vấn đề 5: Nginx 502 Bad Gateway
```bash
# Kiểm tra backend có chạy không
curl http://localhost:8000
curl http://localhost:5000

# Restart Nginx
sudo systemctl restart nginx

# Kiểm tra Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Checklist Deploy hoàn chỉnh

### Bước cơ bản (BẮT BUỘC):
- [ ] **Bước 0**: SSH vào Ubuntu server
- [ ] **Bước 1**: Update system & cài công cụ cơ bản
- [ ] **Bước 1**: Cấu hình Firewall (UFW)
- [ ] **Bước 2**: Cài Docker & Docker Compose
- [ ] **Bước 3**: Clone repository từ GitHub
- [ ] **Bước 4**: Cấu hình file `.env` (đổi passwords mạnh!)
- [ ] **Bước 4**: Chỉnh sửa `docker-compose.yml` (đổi passwords, comment phpMyAdmin)
- [ ] **Bước 5**: Build và start Docker containers
- [ ] **Bước 5**: Install Composer dependencies
- [ ] **Bước 5**: Generate Laravel key & run migrations
- [ ] **Bước 5**: Install npm dependencies
- [ ] **Bước 5**: Test từ localhost
- [ ] **Bước 6**: Cài Nginx reverse proxy
- [ ] **Bước 6**: Test từ browser bên ngoài

### Bước nâng cao (KHUYẾN NGHỊ):
- [ ] **Bước 7**: Cài SSL certificate (nếu có domain)
- [ ] **Bước 8**: Bind Docker ports về localhost only
- [ ] **Bước 8**: Đổi SSH port (tùy chọn)
- [ ] **Bước 9**: Setup script deploy tự động
- [ ] **Bước 9**: Setup backup database tự động
- [ ] **Bước 9**: Test backup & restore

### Kiểm tra cuối cùng:
- [ ] Truy cập `http://your-ip` thấy giao diện React
- [ ] Truy cập `http://your-ip/api/v1/status` thấy JSON response
- [ ] Xem logs không có lỗi: `docker compose logs`
- [ ] Xem resource usage: `docker stats`
- [ ] Test backup: `./backup.sh`

---

## 🎯 Các lệnh thường dùng

```bash
# Start/Stop/Restart containers
docker compose up -d
docker compose down
docker compose restart

# Xem logs
docker compose logs -f

# Xem containers đang chạy
docker compose ps

# Update code và deploy
cd /var/www/nq57
./deploy.sh

# Backup database
./backup.sh

# Truy cập vào container
docker compose exec app bash
docker compose exec frontend sh

# Clear cache Laravel
docker compose exec app php artisan cache:clear
docker compose exec app php artisan config:clear
docker compose exec app php artisan route:clear
docker compose exec app php artisan view:clear

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🌟 Truy cập ứng dụng

Sau khi deploy xong, mở trình duyệt:

### Với IP:
- **Frontend**: `http://your-server-ip` (ví dụ: http://123.456.789.0)
- **Backend API**: `http://your-server-ip/api/v1/status`
- **Health Check**: `http://your-server-ip/api/v1/health`

### Với Domain (nếu có):
- **Frontend**: `https://your-domain.com`
- **Backend API**: `https://your-domain.com/api/v1/status`

---

## 🎓 Update code sau này

Khi bạn push code mới lên GitHub, chỉ cần SSH vào server và chạy:

```bash
cd /var/www/nq57
./deploy.sh
```

Script sẽ tự động:
- Pull code mới từ GitHub
- Rebuild containers
- Install/update dependencies
- Run migrations
- Clear cache

---

## 📞 Hỗ trợ & Troubleshooting

### Nếu gặp vấn đề:

1. **Kiểm tra logs**:
   ```bash
   docker compose logs -f
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Kiểm tra containers**:
   ```bash
   docker compose ps
   docker stats
   ```

3. **Kiểm tra firewall**:
   ```bash
   sudo ufw status
   ```

4. **Kiểm tra ports**:
   ```bash
   sudo netstat -tulpn | grep -E ':(80|443|3306|8000|5000)'
   ```

5. **Restart services**:
   ```bash
   docker compose restart
   sudo systemctl restart nginx
   ```

### Repository:
🔗 https://github.com/vanluan20112003/resolution57-reporting-system.git

---

## 🎉 Hoàn thành!

Bạn đã deploy thành công **NQ57 Portal** lên Ubuntu server!

**Tech Stack đã cài đặt:**
- ✅ Laravel 10 + PHP 8.1
- ✅ React 18 + Vite
- ✅ MySQL 8.0
- ✅ Redis
- ✅ Nginx Reverse Proxy
- ✅ Docker + Docker Compose
- ✅ Auto Backup
- ✅ SSL (nếu có domain)

**Chúc bạn vận hành thành công! 🚀**

---

---

## 📡 Cấu hình API Endpoints (Tham khảo)

### Cấu trúc tập trung hóa

**File config chính**: `resources/react/src/config/api.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(), // Tự động detect môi trường
  FRONTEND_URL: getFrontendBaseUrl(),

  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
    GOOGLE_REDIRECT: '/api/v1/auth/google/redirect',
    GOOGLE_CALLBACK: '/api/v1/auth/google/callback',
  },

  // Thêm endpoints khác tại đây...
}
```

### Cách sử dụng trong code

**Thay vì:**
```typescript
fetch('http://localhost:8000/api/v1/auth/login', ...)
```

**Sử dụng:**
```typescript
import API_CONFIG from '../config/api'

fetch(API_CONFIG.AUTH.LOGIN, ...)
```

### Khi deploy lên production

**Development** (`resources/react/.env`):
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_FRONTEND_URL=http://localhost:5000
```

**Production** (`resources/react/.env`):
```env
VITE_API_URL=/api/v1
VITE_FRONTEND_URL=https://nq57.vnuhcm.edu.vn
```

**Backend** (`.env`):
```env
APP_URL=https://nq57.vnuhcm.edu.vn
FRONTEND_URL=https://nq57.vnuhcm.edu.vn
GOOGLE_REDIRECT_URI=https://nq57.vnuhcm.edu.vn/api/v1/auth/google/callback
```

---

## 🔑 Authentication Flow

### 1. Login bằng Email/Password

```
User → Frontend → API: POST /api/v1/auth/login
                      { email, password }
API → Frontend: { success, data: { user, access_token } }
Frontend: Lưu token vào localStorage
Frontend: Redirect to /dashboard
```

### 2. Login bằng Google OAuth

```
User → Click "Đăng nhập bằng VNUHCM"
Frontend → API: GET /api/v1/auth/google/redirect
API → Google: Redirect to Google OAuth
Google → User: Chọn account
Google → API: Callback với code
API: Kiểm tra email:
  - Nếu email trong DB → Cho phép login
  - Nếu email @vnuhcm.edu.vn (chưa có trong DB) → Tạo user mới
  - Nếu email khác → Báo lỗi "Không có quyền truy cập"
API → Frontend: Redirect với token hoặc error
```

### 3. Logout

```
User → Click logout
Frontend → API: POST /api/v1/auth/logout (với Bearer token)
API: Xóa token khỏi database
Frontend: Xóa token khỏi localStorage
Frontend: Redirect to /login
```

---

*Tài liệu này được tạo cho dự án NQ57 Portal - Cổng thông tin Nghị quyết 57*
