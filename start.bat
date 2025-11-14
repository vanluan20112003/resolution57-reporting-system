@echo off
chcp 65001 >nul
cls

echo =========================================
echo   NQ57 Portal - Khởi động ứng dụng
echo =========================================
echo.

REM Kiểm tra file .env
if not exist .env (
    echo 📝 Tạo file .env từ .env.example...
    copy .env.example .env >nul
    echo ✅ File .env đã được tạo
) else (
    echo ✅ File .env đã tồn tại
)

REM Kiểm tra vendor folder
if not exist vendor (
    echo.
    echo 📦 Cài đặt Laravel dependencies...
    call composer install
    echo ✅ Laravel dependencies đã được cài đặt
) else (
    echo ✅ Laravel dependencies đã tồn tại
)

REM Generate APP_KEY nếu chưa có
findstr /C:"APP_KEY=" .env | findstr /C:"APP_KEY=$" >nul
if %errorlevel% equ 0 (
    echo.
    echo 🔑 Generate application key...
    php artisan key:generate
    echo ✅ Application key đã được tạo
) else (
    echo ✅ Application key đã tồn tại
)

REM Kiểm tra React dependencies
if not exist resources\react\node_modules (
    echo.
    echo 📦 Cài đặt React dependencies...
    cd resources\react

    REM Copy .env nếu chưa có
    if not exist .env (
        copy .env.example .env >nul
        echo ✅ React .env đã được tạo
    )

    call npm install
    echo ✅ React dependencies đã được cài đặt
    cd ..\..
) else (
    echo ✅ React dependencies đã tồn tại
)

REM Tạo storage symlink
echo.
echo 🔗 Tạo storage link...
php artisan storage:link 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Storage link đã tồn tại
)

REM Hiển thị hướng dẫn
echo.
echo =========================================
echo   ✅ Setup hoàn tất!
echo =========================================
echo.
echo 📌 Để chạy ứng dụng, mở 2 terminals:
echo.
echo Terminal 1 (Laravel Backend):
echo   php artisan serve
echo   → http://localhost:8000
echo.
echo Terminal 2 (React Frontend):
echo   cd resources\react
echo   npm run dev
echo   → http://localhost:5000
echo.
echo =========================================
echo.
pause
