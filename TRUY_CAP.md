# 🌐 Hướng dẫn truy cập Cổng thông tin Nghị quyết 57

## 📱 Các địa chỉ truy cập

### Frontend (Giao diện người dùng)
**URL:** http://localhost:5000

Giao diện chính của hệ thống với:
- Dashboard tổng quan
- Thống kê hệ thống
- Thông tin về Nghị quyết 57
- Trạng thái kết nối database

### Backend API (Laravel)
**URL:** http://localhost:8000

Các endpoint API:
- `GET /api/v1/status` - Trạng thái hệ thống
- `GET /api/v1/health` - Kiểm tra sức khỏe hệ thống
- `GET /api/v1/activities` - Danh sách hoạt động (đang phát triển)

### Database Management (phpMyAdmin)
**URL:** http://localhost:8080

Thông tin đăng nhập:
- **Server:** `mysql`
- **Username:** `nq57_user`
- **Password:** `nq57_password`
- **Database:** `nq57_portal`

## 🗄️ Cấu trúc Database

### Các bảng hiện có:
1. **users** - Quản lý người dùng
   - id, name, email, password
   - phone, department, position
   - is_active, timestamps

2. **password_reset_tokens** - Reset mật khẩu

3. **personal_access_tokens** - API tokens (Sanctum)

4. **migrations** - Quản lý migrations

## 🚀 Các lệnh hữu ích

### Docker
```bash
# Xem logs
docker compose logs -f

# Xem logs của service cụ thể
docker compose logs frontend -f
docker compose logs app -f

# Restart services
docker compose restart

# Dừng tất cả services
docker compose down

# Khởi động lại
docker compose up -d
```

### Laravel (trong container)
```bash
# Truy cập vào container
docker compose exec app bash

# Chạy migrations
docker compose exec app php artisan migrate

# Tạo migration mới
docker compose exec app php artisan make:migration create_activities_table

# Tạo model
docker compose exec app php artisan make:model Activity -m

# Clear cache
docker compose exec app php artisan cache:clear
docker compose exec app php artisan config:clear
docker compose exec app php artisan route:clear
```

### React (trong container)
```bash
# Truy cập vào container
docker compose exec frontend sh

# Install packages mới
docker compose exec frontend npm install <package-name>

# Build cho production
docker compose exec frontend npm run build
```

## 📊 Kiểm tra trạng thái

### Qua Browser
- Frontend: Mở http://localhost:5000
- Backend API: Mở http://localhost:8000/api/v1/status
- phpMyAdmin: Mở http://localhost:8080

### Qua Command Line
```bash
# Kiểm tra API status
curl http://localhost:8000/api/v1/status | python -m json.tool

# Kiểm tra health
curl http://localhost:8000/api/v1/health | python -m json.tool

# Kiểm tra containers
docker compose ps
```

## 🔧 Troubleshooting

### Frontend không hiển thị?
```bash
docker compose logs frontend
docker compose restart frontend
```

### Backend báo lỗi?
```bash
docker compose logs app
docker compose logs nginx
```

### Database không kết nối được?
```bash
docker compose logs mysql
docker compose exec mysql mysql -unq57_user -pnq57_password -e "SHOW DATABASES;"
```

### Reset toàn bộ
```bash
docker compose down
docker compose up -d --build
```

## 📝 Ghi chú

- Tất cả các services đều chạy trong Docker
- Database được persist trong Docker volumes
- Hot reload được bật cho cả Frontend và Backend
- Mọi thay đổi code sẽ tự động cập nhật

## 💡 Tips

1. **Xem database realtime:** Sử dụng phpMyAdmin tại http://localhost:8080
2. **Test API:** Sử dụng Postman hoặc curl
3. **Debug Frontend:** Mở Developer Tools trong browser (F12)
4. **Debug Backend:** Xem logs với `docker compose logs app -f`

---

**Phát triển bởi NQ57 Team** 🚀
