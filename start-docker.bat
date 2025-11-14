@echo off
chcp 65001 >nul
cls

echo =========================================
echo   NQ57 Portal - Khởi động với Docker
echo =========================================
echo.

echo 🐳 Khởi động Docker containers...
docker-compose up -d

echo.
echo ⏳ Đợi containers khởi động...
timeout /t 5 >nul

echo.
echo 📦 Cài đặt Laravel dependencies...
docker-compose exec -T app composer install

echo.
echo 🔑 Generate application key...
docker-compose exec -T app php artisan key:generate

echo.
echo 📦 Cài đặt React dependencies...
docker-compose exec -T frontend npm install

echo.
echo =========================================
echo   ✅ Docker setup hoàn tất!
echo =========================================
echo.
echo 🌐 Các dịch vụ đang chạy:
echo   - Backend (Laravel):  http://localhost:8000
echo   - Frontend (React):   http://localhost:5000
echo   - phpMyAdmin:         http://localhost:8080
echo   - MySQL:              localhost:3306
echo.
echo 📝 Database credentials:
echo   - Database: nq57_portal
echo   - Username: nq57_user
echo   - Password: nq57_password
echo   - Root Password: root_password
echo.
echo 🛠️  Các lệnh hữu ích:
echo   - Xem logs:           docker-compose logs -f
echo   - Dừng containers:    docker-compose down
echo   - Restart:            docker-compose restart
echo.
echo =========================================
echo.
pause
