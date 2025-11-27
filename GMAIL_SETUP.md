# Hướng dẫn cấu hình Gmail cho NQ57 Portal

## Vấn đề hiện tại

API forgot-password đang trả về lỗi 500 vì Gmail từ chối authentication với App Password hiện tại.

**Lỗi:** `535 5.7.8 Username and Password not accepted`

## Nguyên nhân

1. App Password `bpdqyqvsbcibyqhiu` không hợp lệ hoặc đã bị revoke
2. Gmail account chưa bật 2-Step Verification đúng cách
3. App Password format không đúng (cần 16 ký tự)

## Giải pháp: Tạo App Password mới

### Bước 1: Truy cập Gmail Account
1. Đăng nhập vào `nq57@vnuhcm.edu.vn`
2. Truy cập: https://myaccount.google.com/security

### Bước 2: Bật 2-Step Verification
1. Trong mục **Security**, tìm **2-Step Verification**
2. Nếu chưa bật → Click **Get Started** và làm theo hướng dẫn
3. Nếu đã bật → Chuyển sang Bước 3

### Bước 3: Tạo App Password
1. Truy cập: https://myaccount.google.com/apppasswords
2. Trong dropdown **Select app**: Chọn **Mail**
3. Trong dropdown **Select device**: Chọn **Other (Custom name)**
4. Nhập tên: `NQ57 Portal`
5. Click **Generate**
6. Gmail sẽ hiển thị một mã 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)
7. **QUAN TRỌNG**: Copy mã này, BỎ KHOẢNG TRẮNG → `abcdefghijklmnop`

### Bước 4: Cập nhật .env
1. Mở file `d:\NQ57\.env`
2. Tìm dòng `MAIL_PASSWORD`
3. Thay thế bằng App Password mới (KHÔNG có khoảng trắng):

```env
MAIL_PASSWORD="abcdefghijklmnop"
```

4. Lưu file

### Bước 5: Clear cache và test
Chạy các lệnh sau trong terminal:

```bash
# Clear cache trong Docker container
docker exec nq57_app php artisan config:clear
docker exec nq57_app php artisan cache:clear

# Test email
docker exec nq57_app php artisan test:email nq57@vnuhcm.edu.vn
```

Nếu thành công, bạn sẽ thấy:
```
✅ Email sent successfully to: nq57@vnuhcm.edu.vn
```

### Bước 6: Test qua API
1. Mở trình duyệt, truy cập: http://localhost:5000/forgot-password
2. Nhập email: `admin@vnuhcm.edu.vn`
3. Click "Gửi email khôi phục"
4. Kiểm tra email tại `nq57@vnuhcm.edu.vn`

## Phương án thay thế (nếu không muốn dùng Gmail)

### Option 1: Sử dụng Log driver (để test)
Thay vì gửi email thật, Laravel sẽ ghi email vào log file:

```env
MAIL_MAILER=log
MAIL_LOG_CHANNEL=stack
```

Email sẽ được ghi vào: `storage/logs/laravel.log`

### Option 2: Sử dụng Mailtrap (recommended for development)
1. Đăng ký tài khoản miễn phí tại: https://mailtrap.io
2. Tạo inbox mới
3. Copy SMTP credentials
4. Cập nhật `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="nq57@vnuhcm.edu.vn"
MAIL_FROM_NAME="${APP_NAME}"
```

### Option 3: Sử dụng VNUHCM SMTP Server
Nếu VNUHCM có SMTP server riêng:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.vnuhcm.edu.vn
MAIL_PORT=587
MAIL_USERNAME=nq57@vnuhcm.edu.vn
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="nq57@vnuhcm.edu.vn"
MAIL_FROM_NAME="${APP_NAME}"
```

## Troubleshooting

### Lỗi: Connection timeout
- Kiểm tra firewall/antivirus có chặn port 587 không
- Thử port 465 với `MAIL_ENCRYPTION=ssl`

### Lỗi: Certificate verify failed
- Thử thêm vào `.env`:
```env
MAIL_VERIFY_PEER=false
```

### Lỗi: Authentication failed
- Xác nhận App Password đúng (không có khoảng trắng)
- Xác nhận 2-Step Verification đã bật
- Thử tạo App Password mới

## Kiểm tra hiện trạng

Để kiểm tra config hiện tại trong Docker:

```bash
# Check MAIL_HOST
docker exec nq57_app php artisan tinker --execute="echo config('mail.mailers.smtp.host') . PHP_EOL;"

# Check MAIL_PASSWORD length
docker exec nq57_app php artisan tinker --execute="echo strlen(config('mail.mailers.smtp.password')) . PHP_EOL;"
```

## Support

Nếu vẫn gặp vấn đề, vui lòng cung cấp:
1. Screenshot của Gmail Security settings
2. Output của lệnh test email
3. Nội dung file `storage/logs/laravel.log` (50 dòng cuối)
