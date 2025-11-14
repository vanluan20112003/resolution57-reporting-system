#!/bin/bash

echo "========================================="
echo "  NQ57 Portal - Khởi động ứng dụng"
echo "========================================="
echo ""

# Kiểm tra nếu file .env đã tồn tại
if [ ! -f .env ]; then
    echo "📝 Tạo file .env từ .env.example..."
    cp .env.example .env
    echo "✅ File .env đã được tạo"
else
    echo "✅ File .env đã tồn tại"
fi

# Kiểm tra nếu vendor folder đã tồn tại
if [ ! -d "vendor" ]; then
    echo ""
    echo "📦 Cài đặt Laravel dependencies..."
    composer install
    echo "✅ Laravel dependencies đã được cài đặt"
else
    echo "✅ Laravel dependencies đã tồn tại"
fi

# Generate APP_KEY nếu chưa có
if grep -q "APP_KEY=$" .env; then
    echo ""
    echo "🔑 Generate application key..."
    php artisan key:generate
    echo "✅ Application key đã được tạo"
else
    echo "✅ Application key đã tồn tại"
fi

# Kiểm tra React dependencies
if [ ! -d "resources/react/node_modules" ]; then
    echo ""
    echo "📦 Cài đặt React dependencies..."
    cd resources/react

    # Copy .env nếu chưa có
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ React .env đã được tạo"
    fi

    npm install
    echo "✅ React dependencies đã được cài đặt"
    cd ../..
else
    echo "✅ React dependencies đã tồn tại"
fi

# Tạo storage symlink
echo ""
echo "🔗 Tạo storage link..."
php artisan storage:link 2>/dev/null || echo "⚠️  Storage link đã tồn tại"

# Hiển thị hướng dẫn
echo ""
echo "========================================="
echo "  ✅ Setup hoàn tất!"
echo "========================================="
echo ""
echo "📌 Để chạy ứng dụng, mở 2 terminals:"
echo ""
echo "Terminal 1 (Laravel Backend):"
echo "  php artisan serve"
echo "  → http://localhost:8000"
echo ""
echo "Terminal 2 (React Frontend):"
echo "  cd resources/react"
echo "  npm run dev"
echo "  → http://localhost:5000"
echo ""
echo "========================================="
