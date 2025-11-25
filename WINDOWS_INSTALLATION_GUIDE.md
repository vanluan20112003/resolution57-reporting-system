# 🪟 Hướng dẫn Cài đặt NQ57 Portal trên Windows

> **Repository GitHub**: https://github.com/vanluan20112003/resolution57-reporting-system.git

## 📋 Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Bước 1: Cài đặt các phần mềm cần thiết](#bước-1-cài-đặt-các-phần-mềm-cần-thiết)
4. [Bước 2: Cài đặt PHP và Composer](#bước-2-cài-đặt-php-và-composer)
5. [Bước 3: Cài đặt MySQL](#bước-3-cài-đặt-mysql)
6. [Bước 4: Cài đặt Node.js và npm](#bước-4-cài-đặt-nodejs-và-npm)
7. [Bước 5: Clone và cấu hình Project](#bước-5-clone-và-cấu-hình-project)
8. [Bước 6: Cài đặt Backend (Laravel)](#bước-6-cài-đặt-backend-laravel)
9. [Bước 7: Cài đặt Frontend (React)](#bước-7-cài-đặt-frontend-react)
10. [Bước 8: Chạy ứng dụng](#bước-8-chạy-ứng-dụng)
11. [Bước 9: Troubleshooting](#bước-9-troubleshooting)

---

## 📖 Giới thiệu

Hướng dẫn này giúp bạn cài đặt **NQ57 Portal** trên máy Windows từ đầu đến cuối, không cần Docker.

**Tech Stack:**
- Backend: Laravel 10 + PHP 8.1
- Frontend: React 18 + Vite
- Database: MySQL 8.0
- Web Server: PHP Built-in Server

---

## ⚙️ Yêu cầu hệ thống

### Yêu cầu tối thiểu:
- **OS**: Windows 10/11 (64-bit)
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB)
- **Disk**: Tối thiểu 10GB trống
- **Quyền**: Quyền Administrator để cài đặt phần mềm

### Phần mềm cần cài:
- PHP 8.1 hoặc cao hơn
- Composer (PHP Package Manager)
- MySQL 8.0 hoặc cao hơn
- Node.js 18.x hoặc cao hơn
- Git for Windows
- Text Editor (VS Code khuyến nghị)

---

## 🛠️ Bước 1: Cài đặt các phần mềm cần thiết

### 1.1. Cài đặt Git for Windows

**Download và cài đặt:**
1. Truy cập: https://git-scm.com/download/win
2. Download bản **64-bit Git for Windows Setup**
3. Chạy file cài đặt, giữ nguyên các thiết lập mặc định
4. Click **Next** → **Next** → **Install**

**Kiểm tra cài đặt:**
```cmd
# Mở Command Prompt (CMD) hoặc PowerShell
git --version
```

Kết quả: `git version 2.x.x.windows.x`

### 1.2. Cài đặt VS Code (Optional nhưng khuyến nghị)

1. Truy cập: https://code.visualstudio.com/
2. Download và cài đặt
3. Trong quá trình cài đặt, chọn:
   - ✅ Add "Open with Code" to context menu
   - ✅ Add to PATH

---

## 🐘 Bước 2: Cài đặt PHP và Composer

### 2.1. Download PHP 8.1+

**Cách 1: Download trực tiếp từ windows.php.net**

1. Truy cập: https://windows.php.net/download/
2. Download **PHP 8.1** (VC15 x64 Thread Safe) - file ZIP
3. Giải nén vào thư mục `C:\php`

**Cách 2: Sử dụng XAMPP (Dễ hơn cho người mới)**

1. Truy cập: https://www.apachefriends.org/download.html
2. Download **XAMPP for Windows** (PHP 8.1+)
3. Cài đặt vào `C:\xampp`
4. PHP sẽ nằm tại `C:\xampp\php`

### 2.2. Cấu hình PHP

**Với PHP từ windows.php.net:**
```cmd
# Mở PowerShell với quyền Administrator
# Thêm PHP vào PATH
setx PATH "%PATH%;C:\php" /M
```

**Với XAMPP:**
```cmd
# Mở PowerShell với quyền Administrator
setx PATH "%PATH%;C:\xampp\php" /M
```

**Đóng và mở lại CMD/PowerShell mới để áp dụng PATH**

### 2.3. Chỉnh sửa php.ini

**Tìm file php.ini:**
- PHP standalone: `C:\php\php.ini` (copy từ `php.ini-development`)
- XAMPP: `C:\xampp\php\php.ini`

**Mở file php.ini và bỏ comment (xóa dấu `;`) các dòng sau:**
```ini
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=mysqli
extension=openssl
extension=pdo_mysql
extension=zip

; Tăng giới hạn upload
upload_max_filesize = 100M
post_max_size = 100M
max_execution_time = 300
memory_limit = 512M
```

**Lưu file và đóng lại**

**Kiểm tra PHP:**
```cmd
php -v
```

Kết quả: `PHP 8.1.x (cli) ...`

```cmd
# Kiểm tra các extension đã bật
php -m
```

Bạn phải thấy các extension: `curl`, `mysqli`, `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`

### 2.4. Cài đặt Composer

1. Truy cập: https://getcomposer.org/download/
2. Download **Composer-Setup.exe** (Windows Installer)
3. Chạy file cài đặt
4. Chọn đường dẫn đến `php.exe`:
   - PHP standalone: `C:\php\php.exe`
   - XAMPP: `C:\xampp\php\php.exe`
5. Click **Next** → **Install**

**Kiểm tra Composer:**
```cmd
composer --version
```

Kết quả: `Composer version 2.x.x`

---

## 🗄️ Bước 3: Cài đặt MySQL

### 3.1. Download MySQL

**Cách 1: MySQL Community Server (Khuyến nghị)**

1. Truy cập: https://dev.mysql.com/downloads/mysql/
2. Chọn **Windows (x86, 64-bit), ZIP Archive**
3. Click **Download** (không cần đăng nhập, chọn "No thanks, just start my download")

**Cách 2: Sử dụng XAMPP (Nếu đã cài ở bước 2)**

- MySQL đã có sẵn trong XAMPP tại `C:\xampp\mysql`
- Bỏ qua các bước cài MySQL bên dưới

### 3.2. Cài đặt MySQL Community Server

1. Giải nén file ZIP vào `C:\mysql`
2. Mở PowerShell với quyền **Administrator**
3. Chạy các lệnh sau:

```powershell
# Di chuyển vào thư mục MySQL
cd C:\mysql\bin

# Khởi tạo MySQL (chỉ chạy 1 lần)
.\mysqld --initialize-insecure

# Cài MySQL như service
.\mysqld --install

# Start MySQL service
net start MySQL
```

### 3.3. Cấu hình MySQL (Nếu dùng MySQL Community)

```cmd
# Đăng nhập MySQL (mật khẩu root ban đầu là rỗng)
mysql -u root

# Trong MySQL console:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
EXIT;
```

**Thay `your_password` bằng mật khẩu mạnh của bạn!**

### 3.4. Cấu hình MySQL (Nếu dùng XAMPP)

1. Mở **XAMPP Control Panel**
2. Click **Start** cho MySQL
3. Click **Admin** để mở phpMyAdmin
4. Hoặc sử dụng MySQL từ command line:

```cmd
cd C:\xampp\mysql\bin
mysql -u root
```

### 3.5. Tạo Database

```cmd
# Đăng nhập MySQL
mysql -u root -p
# Nhập password nếu đã đặt

# Trong MySQL console:
CREATE DATABASE nq57_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nq57_user'@'localhost' IDENTIFIED BY 'nq57_password';
GRANT ALL PRIVILEGES ON nq57_portal.* TO 'nq57_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Lưu ý:** Nhớ lại thông tin này:
- Database: `nq57_portal`
- Username: `nq57_user`
- Password: `nq57_password`

---

## 📦 Bước 4: Cài đặt Node.js và npm

### 4.1. Download Node.js

1. Truy cập: https://nodejs.org/
2. Download bản **LTS** (Long Term Support) - ví dụ: Node.js 18.x hoặc 20.x
3. Download **Windows Installer (.msi)** - 64-bit
4. Chạy file cài đặt, giữ nguyên thiết lập mặc định
5. Click **Next** → **Next** → **Install**

### 4.2. Kiểm tra Node.js và npm

```cmd
node --version
```
Kết quả: `v18.x.x` hoặc `v20.x.x`

```cmd
npm --version
```
Kết quả: `9.x.x` hoặc `10.x.x`

### 4.3. Cấu hình npm (Optional)

```cmd
# Tăng timeout cho npm (nếu mạng chậm)
npm config set fetch-timeout 60000
npm config set fetch-retry-maxtimeout 120000
```

---

## 📥 Bước 5: Clone và cấu hình Project

### 5.1. Chọn thư mục làm việc

**Tạo thư mục project:**
```cmd
# Mở Command Prompt
# Tạo thư mục tại ổ D (hoặc ổ bạn muốn)
mkdir D:\Projects
cd D:\Projects
```

### 5.2. Clone Repository từ GitHub

```cmd
# Clone project
git clone https://github.com/vanluan20112003/resolution57-reporting-system.git NQ57

# Di chuyển vào thư mục project
cd NQ57

# Kiểm tra code đã clone
dir
```

**Kết quả:** Bạn sẽ thấy các thư mục:
```
app/
config/
database/
resources/
.env.example
composer.json
...
```

### 5.3. Tạo file .env

```cmd
# Copy file .env từ template
copy .env.example .env
```

### 5.4. Chỉnh sửa file .env

**Mở file `.env` bằng Notepad hoặc VS Code:**

```cmd
# Mở bằng Notepad
notepad .env

# Hoặc mở bằng VS Code (nếu đã cài)
code .env
```

**Chỉnh sửa các thông tin sau:**
```env
APP_NAME="NQ57 Portal"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database - Sử dụng thông tin đã tạo ở Bước 3
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nq57_portal
DB_USERNAME=nq57_user
DB_PASSWORD=nq57_password

# Redis - Để mặc định hoặc comment nếu không dùng
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Cache & Session - Dùng file thay vì Redis
CACHE_DRIVER=file
SESSION_DRIVER=file

# Frontend URL
FRONTEND_URL=http://localhost:5000

# CORS
CORS_ALLOWED_ORIGINS="http://localhost:5000,http://localhost:3000"
```

**Lưu file:** `Ctrl + S` và đóng lại

---

## 🚀 Bước 6: Cài đặt Backend (Laravel)

### 6.1. Cài đặt Dependencies

```cmd
# Đảm bảo bạn đang ở thư mục project
cd D:\Projects\NQ57

# Cài đặt Composer packages (có thể mất 3-5 phút)
composer install
```

**Nếu gặp lỗi về memory limit:**
```cmd
php -d memory_limit=-1 C:\ProgramData\ComposerSetup\bin\composer.phar install
```

### 6.2. Generate Application Key

```cmd
php artisan key:generate
```

Kết quả: `Application key set successfully.`

### 6.3. Tạo thư mục Storage và set permissions

```cmd
# Tạo các thư mục cần thiết
mkdir storage\framework\cache
mkdir storage\framework\sessions
mkdir storage\framework\views
mkdir storage\logs
mkdir bootstrap\cache
```

**Lưu ý:** Windows không có vấn đề về permissions như Linux, nên bỏ qua bước chmod

### 6.4. Chạy Database Migrations

```cmd
php artisan migrate
```

**Nếu thành công, bạn sẽ thấy:**
```
Migration table created successfully.
Migrating: xxxx_create_users_table
Migrated:  xxxx_create_users_table (xx.xxms)
...
```

**Nếu gặp lỗi kết nối database:**
- Kiểm tra MySQL đã chạy chưa: `net start MySQL` (hoặc start từ XAMPP Control Panel)
- Kiểm tra thông tin DB trong file `.env`
- Test kết nối: `mysql -u nq57_user -p nq57_portal`

### 6.5. Seed Database (Optional - nếu có data mẫu)

```cmd
php artisan db:seed
```

### 6.6. Cache Configuration

```cmd
php artisan config:cache
php artisan route:cache
```

---

## ⚛️ Bước 7: Cài đặt Frontend (React)

### 7.1. Di chuyển vào thư mục frontend

```cmd
cd D:\Projects\NQ57\resources\react
```

### 7.2. Cài đặt npm packages

```cmd
# Cài đặt dependencies (có thể mất 3-5 phút)
npm install
```

**Nếu gặp lỗi, thử:**
```cmd
# Xóa node_modules và package-lock.json
rmdir /s /q node_modules
del package-lock.json

# Cài lại
npm install
```

### 7.3. Cấu hình Vite (nếu cần)

**Kiểm tra file `vite.config.js`:**
```cmd
notepad vite.config.js
```

**Đảm bảo có cấu hình sau:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

---

## 🎯 Bước 8: Chạy ứng dụng

### 8.1. Mở 2 cửa sổ Command Prompt

**Cửa sổ 1 - Backend (Laravel):**
```cmd
# Di chuyển vào thư mục project
cd D:\Projects\NQ57

# Chạy Laravel development server
php artisan serve
```

**Kết quả:**
```
Starting Laravel development server: http://127.0.0.1:8000
[Tue Jan 24 10:00:00 2024] PHP 8.1.x Development Server (http://127.0.0.1:8000) started
```

**Cửa sổ 2 - Frontend (React):**
```cmd
# Di chuyển vào thư mục frontend
cd D:\Projects\NQ57\resources\react

# Chạy Vite development server
npm run dev
```

**Kết quả:**
```
  VITE v5.0.x  ready in xxx ms

  ➜  Local:   http://localhost:5000/
  ➜  Network: http://192.168.x.x:5000/
  ➜  press h to show help
```

### 8.2. Test ứng dụng

**Mở trình duyệt:**

1. **Frontend (React):** http://localhost:5000
2. **Backend API:** http://localhost:8000/api/v1/status
3. **Backend Health:** http://localhost:8000/api/v1/health

**Nếu thấy giao diện hoặc JSON response, cài đặt đã thành công! 🎉**

### 8.3. Dừng ứng dụng

Trong mỗi cửa sổ CMD, nhấn `Ctrl + C` để dừng server

---

## 🔧 Bước 9: Troubleshooting

### ❌ Vấn đề 1: "php is not recognized"

**Nguyên nhân:** PHP chưa được thêm vào PATH

**Giải pháp:**
1. Mở **System Environment Variables**
2. System Properties → Advanced → Environment Variables
3. Trong **System variables**, tìm `Path`
4. Click **Edit** → **New** → Thêm `C:\php` hoặc `C:\xampp\php`
5. Click **OK** → **OK** → **OK**
6. Đóng và mở lại CMD

### ❌ Vấn đề 2: "composer not found"

**Giải pháp:**
```cmd
# Chạy lại Composer Installer
# Hoặc dùng đường dẫn đầy đủ:
php C:\ProgramData\ComposerSetup\bin\composer.phar install
```

### ❌ Vấn đề 3: Database connection error

**Kiểm tra MySQL đang chạy:**

**Với MySQL Community:**
```cmd
net start MySQL
```

**Với XAMPP:**
- Mở XAMPP Control Panel
- Click **Start** cho MySQL
- Kiểm tra port (mặc định là 3306)

**Test kết nối:**
```cmd
mysql -u nq57_user -p
# Nhập password: nq57_password
```

**Nếu không kết nối được:**
- Kiểm tra lại file `.env`
- Kiểm tra user và database đã tạo:
```sql
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user='nq57_user';
```

### ❌ Vấn đề 4: Port 8000 hoặc 5000 đã được sử dụng

**Tìm process đang dùng port:**
```cmd
netstat -ano | findstr :8000
netstat -ano | findstr :5000
```

**Kill process:**
```cmd
# Thay PID bằng số Process ID từ lệnh trên
taskkill /PID <PID> /F
```

**Hoặc đổi port:**

Backend:
```cmd
php artisan serve --port=8001
```

Frontend (sửa trong `vite.config.js` hoặc):
```cmd
npm run dev -- --port 5001
```

### ❌ Vấn đề 5: npm install lỗi

**Giải pháp 1: Xóa cache npm**
```cmd
npm cache clean --force
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Giải pháp 2: Dùng yarn thay vì npm**
```cmd
npm install -g yarn
yarn install
yarn dev
```

### ❌ Vấn đề 6: Extension PHP bị thiếu

**Kiểm tra extensions đã bật:**
```cmd
php -m
```

**Nếu thiếu extension:**
1. Mở `php.ini`
2. Tìm dòng `;extension=mysqli` (hoặc extension khác)
3. Xóa dấu `;` để bỏ comment
4. Lưu file
5. Restart PHP server (`Ctrl + C` và chạy lại `php artisan serve`)

### ❌ Vấn đề 7: CORS Error khi gọi API

**Kiểm tra file `.env`:**
```env
CORS_ALLOWED_ORIGINS="http://localhost:5000,http://localhost:3000"
```

**Clear cache:**
```cmd
php artisan config:clear
php artisan cache:clear
```

---

## 📝 Các lệnh thường dùng

### Laravel Commands

```cmd
# Start server
php artisan serve

# Start server với port khác
php artisan serve --port=8001

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Chạy migrations
php artisan migrate

# Rollback migration
php artisan migrate:rollback

# Tạo migration mới
php artisan make:migration create_table_name

# Tạo model
php artisan make:model ModelName

# Tạo controller
php artisan make:controller ControllerName
```

### Frontend Commands

```cmd
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### MySQL Commands

```cmd
# Đăng nhập MySQL
mysql -u root -p

# Đăng nhập với user cụ thể
mysql -u nq57_user -p nq57_portal

# Backup database
mysqldump -u nq57_user -p nq57_portal > D:\backup.sql

# Restore database
mysql -u nq57_user -p nq57_portal < D:\backup.sql

# Start MySQL service
net start MySQL

# Stop MySQL service
net stop MySQL
```

---

## 📚 Tài nguyên bổ sung

### Documentation
- Laravel: https://laravel.com/docs/10.x
- React: https://react.dev/
- Vite: https://vitejs.dev/
- Ant Design: https://ant.design/

### Tools
- XAMPP: https://www.apachefriends.org/
- Composer: https://getcomposer.org/
- Node.js: https://nodejs.org/
- Git: https://git-scm.com/
- VS Code: https://code.visualstudio.com/

### Extensions VS Code (Khuyến nghị)
- PHP Intelephense
- Laravel Extension Pack
- ESLint
- Prettier
- GitLens
- Better Comments

---

## 🎉 Hoàn thành!

Bạn đã cài đặt thành công **NQ57 Portal** trên Windows!

**Để chạy ứng dụng mỗi lần:**

1. Mở 2 cửa sổ Command Prompt
2. Cửa sổ 1 (Backend):
   ```cmd
   cd D:\Projects\NQ57
   php artisan serve
   ```
3. Cửa sổ 2 (Frontend):
   ```cmd
   cd D:\Projects\NQ57\resources\react
   npm run dev
   ```
4. Truy cập: http://localhost:5000

**Chúc bạn phát triển thành công! 🚀**

---

## 🔄 Update code sau này

Khi có code mới từ GitHub:

```cmd
# Di chuyển vào thư mục project
cd D:\Projects\NQ57

# Pull code mới
git pull origin main

# Update backend
composer install
php artisan migrate
php artisan config:cache

# Update frontend
cd resources\react
npm install
```

---

*Tài liệu này được tạo cho dự án NQ57 Portal - Cổng thông tin Nghị quyết 57*
*Phiên bản Windows Installation Guide v1.0*
