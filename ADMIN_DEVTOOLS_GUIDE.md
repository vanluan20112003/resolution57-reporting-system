# Hướng Dẫn ADMIN Enable DevTools

## Tổng Quan

Trong production, DevTools bị block cho tất cả users **TRỪ ADMIN**.

ADMIN có thể enable DevTools để debug và kiểm tra hệ thống.

---

## Cách 1: Tự động enable khi đăng nhập (Khuyến nghị)

### Bước 1: Thêm code vào AuthContext hoặc Login component

```javascript
import { enableDevToolsBypass } from '@/utils/antiDevTools'

// Sau khi đăng nhập thành công
const handleLogin = async (credentials) => {
  const response = await loginAPI(credentials)
  const user = response.data.user

  // Nếu là ADMIN, tự động enable DevTools
  if (user.role === 'ADMIN') {
    enableDevToolsBypass(user) // Bypass 24 giờ
    // hoặc custom duration:
    // enableDevToolsBypass(user, 12 * 60 * 60 * 1000) // 12 giờ
  }

  // Continue with normal login flow...
}
```

### Bước 2: Disable khi logout

```javascript
import { disableDevToolsBypass } from '@/utils/antiDevTools'

const handleLogout = () => {
  // Xóa bypass khi logout
  if (user.role === 'ADMIN') {
    disableDevToolsBypass()
  }

  // Continue with normal logout flow...
}
```

---

## Cách 2: Manual enable từ Console (Tạm thời)

### Nếu chưa tích hợp vào code, ADMIN có thể enable manual:

1. **Mở Console** (trước khi bị block):
   - Ngay khi vào trang, nhanh tay nhấn F12
   - Hoặc vào từ trang development rồi navigate sang production

2. **Chạy command trong Console**:

```javascript
// Enable DevTools bypass
localStorage.setItem('__dev_bypass__', JSON.stringify({
  role: 'ADMIN',
  userId: 'your-user-id',
  email: 'admin@example.com',
  expires: Date.now() + (24 * 60 * 60 * 1000), // 24 giờ
  timestamp: Date.now()
}))

// Reload page
location.reload()
```

3. **Sau khi reload**, DevTools sẽ hoạt động bình thường! 🎉

---

## Kiểm tra trạng thái Bypass

### Trong Console, chạy:

```javascript
// Check xem bypass có active không
const bypassData = localStorage.getItem('__dev_bypass__')
if (bypassData) {
  const data = JSON.parse(bypassData)
  console.log('Bypass active:', {
    email: data.email,
    expiresIn: Math.round((data.expires - Date.now()) / (1000 * 60)) + ' minutes'
  })
} else {
  console.log('Bypass INACTIVE')
}
```

### Hoặc dùng helper function (nếu đã import):

```javascript
import { checkBypassStatus } from '@/utils/antiDevTools'

checkBypassStatus()
// Output:
// ✅ Bypass is ACTIVE
// User: admin@example.com
// Expires in: 1439 minutes
```

---

## Disable Bypass

### Khi muốn disable DevTools bypass:

```javascript
// Xóa bypass
localStorage.removeItem('__dev_bypass__')
location.reload()
```

### Hoặc dùng helper function:

```javascript
import { disableDevToolsBypass } from '@/utils/antiDevTools'

disableDevToolsBypass()
```

---

## Demo Flow

### Scenario: ADMIN đăng nhập và cần debug

```javascript
// 1. User login thành công
const loginResponse = await loginAPI({ email, password })
const user = loginResponse.data.user

console.log('User role:', user.role) // "ADMIN"

// 2. Auto-enable DevTools bypass
if (user.role === 'ADMIN') {
  enableDevToolsBypass(user, 24 * 60 * 60 * 1000) // 24 giờ
  // → Page tự động reload
  // → DevTools hoạt động bình thường
  // → Console hiện: "🔓 ADMIN Mode: DevTools protection bypassed"
}

// 3. ADMIN có thể:
// - Mở DevTools (F12) ✅
// - Sử dụng console.log ✅
// - Right-click ✅
// - View Source ✅
// - Debug như bình thường ✅

// 4. Khi logout
handleLogout() // Tự động gọi disableDevToolsBypass()
```

---

## API Reference

### `enableDevToolsBypass(user, duration?)`

Enable DevTools bypass cho ADMIN.

**Parameters:**
- `user` (Object) - User object với `role`, `id`, `email`
- `duration` (Number, optional) - Thời gian bypass (ms). Default: 24 giờ

**Example:**
```javascript
enableDevToolsBypass(user) // 24 giờ
enableDevToolsBypass(user, 12 * 60 * 60 * 1000) // 12 giờ
enableDevToolsBypass(user, 7 * 24 * 60 * 60 * 1000) // 7 ngày
```

---

### `disableDevToolsBypass()`

Disable DevTools bypass và xóa flag.

**Example:**
```javascript
disableDevToolsBypass()
// → Xóa localStorage
// → Reload page
// → DevTools bị block lại
```

---

### `checkBypassStatus()`

Kiểm tra trạng thái bypass hiện tại.

**Example:**
```javascript
checkBypassStatus()
// Output:
// ✅ Bypass is ACTIVE
// User: admin@example.com
// Expires in: 720 minutes
```

---

## Security Notes

### 🔒 Bảo mật:

1. **Chỉ ADMIN mới có thể enable bypass**
   - Check role từ server-side
   - Không tin tưởng client-side role

2. **Bypass có thời hạn**
   - Mặc định 24 giờ
   - Tự động hết hạn sau khoảng thời gian
   - Phải re-authenticate để gia hạn

3. **Flag được lưu trong localStorage**
   - Không share máy tính với người khác
   - Clear localStorage khi logout
   - Logout tự động disable bypass

4. **Server-side vẫn check permissions**
   - Bypass chỉ ảnh hưởng client-side
   - API vẫn check role/permission bình thường
   - Không thể escalate privileges

---

## Troubleshooting

### ❓ DevTools vẫn bị block sau khi enable?

**Giải pháp:**
1. Check localStorage có flag chưa:
   ```javascript
   console.log(localStorage.getItem('__dev_bypass__'))
   ```
2. Reload lại page: `location.reload()`
3. Check role có đúng là ADMIN không

---

### ❓ Bypass bị mất sau khi reload?

**Nguyên nhân:** Flag đã hết hạn hoặc bị xóa

**Giải pháp:**
1. Check expiry time:
   ```javascript
   const data = JSON.parse(localStorage.getItem('__dev_bypass__'))
   console.log('Expires:', new Date(data.expires))
   ```
2. Enable lại với duration dài hơn

---

### ❓ Console vẫn bị clear liên tục?

**Nguyên nhân:** Bypass chưa được apply

**Giải pháp:**
1. Hard reload: Ctrl+Shift+R
2. Clear cache và reload
3. Re-enable bypass với command manual

---

## Quick Commands

```javascript
// 1. Enable bypass (24 giờ)
localStorage.setItem('__dev_bypass__', JSON.stringify({
  role: 'ADMIN',
  userId: 'admin-id',
  email: 'admin@nq57.edu.vn',
  expires: Date.now() + 86400000,
  timestamp: Date.now()
})); location.reload()

// 2. Check status
JSON.parse(localStorage.getItem('__dev_bypass__'))

// 3. Disable bypass
localStorage.removeItem('__dev_bypass__'); location.reload()
```

---

**📝 Note:** Chỉ sử dụng bypass cho mục đích debug và development. Đừng share credentials ADMIN với người khác!
