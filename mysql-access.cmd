@echo off
echo ========================================
echo   NQ57 Portal - MySQL Access
echo ========================================
echo.

echo [1] Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Waiting 30 seconds for Docker to start...
timeout /t 30 /nobreak > nul

echo.
echo [2] Starting containers...
cd /d D:\NQ57
docker compose up -d

echo.
echo [3] Checking containers status...
docker compose ps

echo.
echo ========================================
echo   MySQL Access Information
echo ========================================
echo.
echo phpMyAdmin (Browser):
echo   URL: http://localhost:8080
echo   Username: root
echo   Password: root_password
echo.
echo MySQL Command Line:
echo   docker compose exec mysql mysql -u root -p
echo   Password: root_password
echo.
echo Database Info:
echo   Host: localhost
echo   Port: 3306
echo   Database: nq57_portal
echo   Username: nq57_user
echo   Password: nq57_password
echo.
echo ========================================
echo.

pause
