# NQ57 Portal - Logging Documentation

## Tổng quan

Hệ thống logging đã được triển khai đầy đủ cho NQ57 Portal, giúp theo dõi và debug các hoạt động của ứng dụng.

## Log File Location

Tất cả logs được lưu tại:
```
storage/logs/laravel.log
```

## Logging Features

### 1. ✅ Authentication Logging

#### Email/Password Login
**File**: `app/Http/Controllers/API/AuthController.php`

**Events được log:**
- ✅ **Login Attempt** - Ghi lại mỗi lần thử đăng nhập
  ```
  [INFO] === Email/Password login attempt ===
  {
    "email": "user@example.com",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
  ```

- ✅ **Validation Failed** - Khi form validation lỗi
  ```
  [WARNING] Login validation failed
  {
    "email": "user@example.com",
    "errors": {...}
  }
  ```

- ✅ **Login Failed** - Đăng nhập thất bại (sai email/password)
  ```
  [WARNING] === LOGIN FAILED: Invalid credentials ===
  {
    "email": "user@example.com",
    "user_exists": "no",
    "ip_address": "192.168.1.100"
  }
  ```

- ✅ **Account Inactive** - Tài khoản bị vô hiệu hóa
  ```
  [WARNING] === LOGIN BLOCKED: Account inactive ===
  {
    "user_id": "123",
    "email": "user@example.com",
    "status": "inactive"
  }
  ```

- ✅ **Login Success** - Đăng nhập thành công
  ```
  [INFO] === LOGIN SUCCESS ===
  {
    "user_id": "123",
    "email": "user@example.com",
    "role": "USER",
    "ip_address": "192.168.1.100"
  }
  ```

- ✅ **Login Error** - Lỗi hệ thống khi đăng nhập
  ```
  [ERROR] === LOGIN ERROR ===
  {
    "email": "user@example.com",
    "error": "Error message",
    "trace": "Stack trace..."
  }
  ```

#### Google OAuth Login
**File**: `app/Http/Controllers/API/GoogleAuthController.php`

**Events được log:**
- ✅ **Google Callback Started**
- ✅ **Google User Data Retrieved**
- ✅ **Database User Lookup**
- ✅ **Email Domain Check**
- ✅ **Unauthorized Access** (non-VNUHCM email)
- ✅ **User Creation** (new VNUHCM user)
- ✅ **User Already Exists**
- ✅ **Token Generation**
- ✅ **Callback Errors**

#### Logout
**File**: `app/Http/Controllers/API/AuthController.php`

**Events được log:**
- ✅ **Logout** - Khi user đăng xuất
  ```
  [INFO] === LOGOUT ===
  {
    "user_id": "123",
    "email": "user@example.com",
    "ip_address": "192.168.1.100"
  }
  ```

- ✅ **Logout Error**
  ```
  [ERROR] === LOGOUT ERROR ===
  {
    "error": "Error message",
    "trace": "Stack trace..."
  }
  ```

#### Get User Info
**File**: `app/Http/Controllers/API/AuthController.php`

**Events được log:**
- ✅ **Get User Info** - Khi lấy thông tin user
  ```
  [INFO] === GET USER INFO ===
  {
    "user_id": "123",
    "email": "user@example.com"
  }
  ```

### 2. ✅ API Request Logging

**Middleware**: `app/Http/Middleware/LogApiRequests.php`

Tự động log **TẤT CẢ** API requests:

**Request Log:**
```
[INFO] === API REQUEST ===
{
  "method": "POST",
  "url": "http://localhost:8000/api/v1/auth/login",
  "path": "api/v1/auth/login",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "user_id": "guest" // or user ID if authenticated
}
```

**Response Log:**
```
[INFO] === API RESPONSE ===
{
  "method": "POST",
  "path": "api/v1/auth/login",
  "status_code": 200,
  "execution_time_ms": 125.5,
  "user_id": "123"
}
```

### 3. ✅ Session Tracking

**Database Field**: `nq57_users.last_login_at`

- Tự động cập nhật mỗi khi user login thành công
- Giúp theo dõi hoạt động của user
- Có thể dùng để phát hiện tài khoản không hoạt động

## Log Levels

Hệ thống sử dụng các log levels theo chuẩn PSR-3:

- **INFO** - Thông tin bình thường (login success, API calls)
- **WARNING** - Cảnh báo (login failed, unauthorized access)
- **ERROR** - Lỗi hệ thống (exceptions, database errors)
- **DEBUG** - Debug information (development only)

## Cách xem Logs

### 1. Xem log realtime (Docker)
```bash
docker exec -it nq57_app tail -f storage/logs/laravel.log
```

### 2. Xem 100 dòng cuối
```bash
tail -100 storage/logs/laravel.log
```

### 3. Lọc log theo keyword
```bash
# Xem tất cả login attempts
grep "login attempt" storage/logs/laravel.log

# Xem tất cả failed logins
grep "LOGIN FAILED" storage/logs/laravel.log

# Xem tất cả errors
grep "ERROR" storage/logs/laravel.log
```

### 4. Xem log của user cụ thể
```bash
grep '"email":"user@example.com"' storage/logs/laravel.log
```

## Security Best Practices

### ✅ Đã implement:
1. **IP Tracking** - Ghi lại IP address cho mọi login attempt
2. **User Agent Tracking** - Theo dõi browser/device
3. **Failed Login Logging** - Log tất cả failed attempts
4. **Inactive Account Detection** - Cảnh báo khi login vào inactive account
5. **Request/Response Logging** - Track tất cả API calls
6. **Execution Time Tracking** - Phát hiện slow queries

### ⚠️ Lưu ý bảo mật:
1. **KHÔNG log passwords** - Đã được xử lý đúng
2. **KHÔNG log sensitive tokens** - Token được generate nhưng không log plaintext
3. **Log rotation** - Cần setup log rotation để tránh file quá lớn
4. **Access control** - Chỉ admin mới được xem logs

## Log Rotation (Production)

Nên cấu hình log rotation trong production:

### 1. Laravel Daily Log Rotation

Cập nhật `.env`:
```env
LOG_CHANNEL=daily
LOG_LEVEL=info
LOG_DAYS=14
```

### 2. System Log Rotation

Tạo file `/etc/logrotate.d/laravel`:
```
/var/www/nq57-portal/storage/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
}
```

## Monitoring & Alerts

### Có thể tích hợp:

1. **Failed Login Alerts**
   - Cảnh báo khi có > 5 failed logins từ cùng IP trong 5 phút

2. **Error Rate Monitoring**
   - Track số lượng errors per hour
   - Alert khi error rate tăng đột ngột

3. **Performance Monitoring**
   - Track execution time của API calls
   - Alert khi có slow queries (> 1000ms)

4. **Security Monitoring**
   - Phát hiện brute force attacks
   - Unusual login patterns
   - Multiple failed logins

## Log Analysis Tools

### Recommended tools:
1. **Laravel Telescope** - Development debugging
2. **Papertrail** - Cloud log management
3. **ELK Stack** - Elasticsearch + Logstash + Kibana
4. **Sentry** - Error tracking
5. **New Relic** - Application performance monitoring

## Testing Logging

### Test login logging:
```bash
# Test email login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vnuhcm.edu.vn","password":"password"}'

# Check logs
tail -20 storage/logs/laravel.log
```

### Test failed login:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vnuhcm.edu.vn","password":"wrongpassword"}'
```

### Test API logging:
```bash
# Any API call will be logged
curl http://localhost:8000/api/v1/status
```

## Summary

✅ **Hoàn thành:**
- Email/Password login logging
- Google OAuth logging
- Logout logging
- API request/response logging
- Session tracking (last_login_at)
- IP & User Agent tracking
- Execution time tracking
- Error logging

🎯 **Benefits:**
- Security audit trail
- Debug & troubleshooting
- Performance monitoring
- User activity tracking
- Compliance & reporting
