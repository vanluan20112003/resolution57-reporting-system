# Hướng Dẫn Sử Dụng Middleware Permissions

## Tổng Quan

Hệ thống đã được tích hợp 2 middleware để quản lý permissions và roles:

1. **CheckRole** - Kiểm tra role của user (ADMIN, OPERATOR, MANAGER, STAFF, GUEST)
2. **CheckPermission** - Kiểm tra permissions chi tiết theo format `resource.action`

## 1. CheckRole Middleware

### Cách sử dụng trong Routes

```php
// Chỉ ADMIN được truy cập
Route::middleware(['auth:sanctum', 'role:ADMIN'])->group(function () {
    Route::post('/users/{id}/impersonate', [UserController::class, 'impersonate']);
});

// ADMIN hoặc OPERATOR được truy cập
Route::middleware(['auth:sanctum', 'role:ADMIN,OPERATOR'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
});

// Nhiều roles
Route::middleware(['auth:sanctum', 'role:ADMIN,OPERATOR,MANAGER'])->get('/reports', ...);
```

### Response khi không có quyền

```json
{
  "success": false,
  "message": "Unauthorized. You do not have permission to access this resource.",
  "required_roles": ["ADMIN", "OPERATOR"],
  "your_role": "STAFF"
}
```

## 2. CheckPermission Middleware

### Permission Format

Permissions được định nghĩa theo format: `resource.action`

Ví dụ:
- `users.view` - Xem danh sách users
- `users.create` - Tạo user mới
- `users.update` - Cập nhật user
- `users.delete` - Xóa user
- `activities.manage` - Quản lý activities
- `reports.create` - Tạo reports

### Danh sách Permissions theo Role

#### ADMIN
- `*` (tất cả permissions)

#### OPERATOR
- `users.view`, `users.create`, `users.update`, `users.delete`
- `activities.view`, `activities.create`, `activities.update`
- `organizations.view`, `organizations.create`, `organizations.update`
- `projects.view`, `projects.create`, `projects.update`
- `reports.view`, `reports.create`

#### MANAGER
- `users.view`
- `activities.view`, `activities.create`, `activities.update`
- `organizations.view`
- `projects.view`, `projects.create`, `projects.update`
- `reports.view`, `reports.create`

#### STAFF
- `activities.view`, `activities.create`
- `projects.view`
- `reports.view`

#### GUEST
- `activities.view`
- `projects.view`

### Cách sử dụng trong Routes

```php
// Chỉ cần 1 permission
Route::middleware(['auth:sanctum', 'permission:users.create'])
    ->post('/users', [UserController::class, 'store']);

// Cần 1 trong các permissions (OR logic)
Route::middleware(['auth:sanctum', 'permission:users.update,users.delete'])
    ->put('/users/{id}', [UserController::class, 'update']);

// Nhóm routes cùng permission
Route::middleware(['auth:sanctum', 'permission:activities.view'])->prefix('activities')->group(function () {
    Route::get('/', [ActivityController::class, 'index']);
    Route::get('/{id}', [ActivityController::class, 'show']);
});
```

### Response khi không có quyền

```json
{
  "success": false,
  "message": "Unauthorized. You do not have the required permissions.",
  "required_permissions": ["users.create"],
  "your_role": "STAFF"
}
```

## 3. HasPermissions Trait

Trait giúp kiểm tra permissions trong Model hoặc Controller.

### Thêm vào Model

```php
use App\Traits\HasPermissions;

class User extends Model
{
    use HasPermissions;
}
```

### Sử dụng trong Controller

```php
// Kiểm tra role
if ($user->hasRole('ADMIN')) {
    // Admin logic
}

if ($user->hasAnyRole(['ADMIN', 'OPERATOR'])) {
    // Admin hoặc Operator logic
}

// Kiểm tra permission
if ($user->hasPermission('users.create')) {
    // Cho phép tạo user
}

if ($user->can('users.update')) {
    // Cho phép update user
}

// Kiểm tra nhiều permissions
if ($user->hasAnyPermission(['users.create', 'users.update'])) {
    // Có ít nhất 1 trong 2 quyền
}

if ($user->hasAllPermissions(['users.view', 'users.create'])) {
    // Có đủ cả 2 quyền
}

// Helper methods
if ($user->isAdmin()) { }
if ($user->isOperator()) { }
if ($user->isManager()) { }
if ($user->canManageUsers()) { }
if ($user->canManageActivities()) { }
if ($user->canCreateProjects()) { }

// Lấy tất cả permissions
$permissions = $user->getPermissions();
// ['users.view', 'users.create', 'users.update', ...]
```

### Sử dụng trong Blade hoặc Response

```php
// Trong Controller
return response()->json([
    'user' => $user,
    'permissions' => $user->getPermissions(),
    'can_manage_users' => $user->canManageUsers(),
]);
```

## 4. Ví dụ Thực Tế

### Ví dụ 1: User Management Routes

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    // User management - Chỉ OPERATOR và ADMIN
    Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])->prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);           // Xem danh sách
        Route::post('/', [UserController::class, 'store']);          // Tạo mới
        Route::get('/{id}', [UserController::class, 'show']);        // Xem chi tiết
        Route::put('/{id}', [UserController::class, 'update']);      // Cập nhật
        Route::delete('/{id}', [UserController::class, 'destroy']);  // Xóa

        // Impersonation - Chỉ ADMIN
        Route::middleware('role:ADMIN')->group(function () {
            Route::post('/{id}/impersonate', [UserController::class, 'impersonate']);
            Route::post('/stop-impersonate', [UserController::class, 'stopImpersonate']);
        });
    });
});
```

### Ví dụ 2: Activities Routes với Permissions

```php
// routes/api.php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // View activities - Tất cả roles
    Route::get('/activities', [ActivityController::class, 'index'])
        ->middleware('permission:activities.view');

    // Create activities - STAFF trở lên
    Route::post('/activities', [ActivityController::class, 'store'])
        ->middleware('permission:activities.create');

    // Update/Delete activities - MANAGER trở lên
    Route::middleware('permission:activities.update')->group(function () {
        Route::put('/activities/{id}', [ActivityController::class, 'update']);
        Route::delete('/activities/{id}', [ActivityController::class, 'destroy']);
    });
});
```

### Ví dụ 3: Kiểm tra trong Controller

```php
class UserController extends Controller
{
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        // Cách cũ (manual check) - KHÔNG KHUYẾN KHÍCH
        // if (!in_array($user->role, ['ADMIN', 'OPERATOR'])) {
        //     return response()->json(['message' => 'Unauthorized'], 403);
        // }

        // Cách mới (sử dụng trait) - KHUYẾN KHÍCH
        if (!$user->canManageUsers()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage users',
            ], 403);
        }

        // Business logic...
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        // Kiểm tra permission cụ thể
        if (!$user->hasPermission('users.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete users',
            ], 403);
        }

        // Prevent self-deletion
        if ($user->id === $id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account',
            ], 400);
        }

        // Delete logic...
    }
}
```

### Ví dụ 4: Kết hợp Middleware và Trait

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'permission:users.update'])
    ->put('/users/{id}', [UserController::class, 'update']);

// UserController.php
public function update(Request $request, string $id)
{
    $currentUser = $request->user();
    $targetUser = User::find($id);

    // Middleware đã check permission:users.update
    // Giờ chỉ cần check business rules

    // OPERATOR không được update ADMIN/OPERATOR khác
    if ($currentUser->isOperator() && $targetUser->hasAnyRole(['ADMIN', 'OPERATOR'])) {
        return response()->json([
            'success' => false,
            'message' => 'OPERATOR cannot update ADMIN or OPERATOR users',
        ], 403);
    }

    // Update logic...
}
```

## 5. Logging

Tất cả các middleware đều tự động log:
- Access granted
- Access denied
- User info (id, email, role)
- Required permissions/roles
- Request path

Xem logs tại: `storage/logs/laravel.log`

```
[2025-11-27 10:30:45] local.WARNING: CheckRole: Unauthorized access attempt
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_email": "staff@example.com",
  "user_role": "STAFF",
  "required_roles": ["ADMIN","OPERATOR"],
  "path": "api/v1/users"
}
```

## 6. Mở Rộng Permissions

### Thêm Permission Mới

1. Cập nhật trong `CheckPermission` middleware:
```php
protected array $rolePermissions = [
    'OPERATOR' => [
        // ... existing permissions
        'reports.export',  // Thêm permission mới
    ],
];
```

2. Cập nhật trong `HasPermissions` trait:
```php
protected static array $rolePermissionsMap = [
    'OPERATOR' => [
        // ... existing permissions
        'reports.export',  // Thêm permission mới
    ],
];
```

3. Sử dụng trong route:
```php
Route::middleware(['auth:sanctum', 'permission:reports.export'])
    ->get('/reports/export', [ReportController::class, 'export']);
```

### Thêm Helper Method

Thêm vào `HasPermissions` trait:
```php
public function canExportReports(): bool
{
    return $this->hasPermission('reports.export');
}
```

## 7. Best Practices

1. **Ưu tiên middleware trong routes** thay vì check trong controller
2. **Sử dụng trait methods** để kiểm tra business logic phức tạp trong controller
3. **Luôn log** các unauthorized access attempts
4. **Giữ permissions đồng bộ** giữa middleware và trait
5. **Đặt tên permissions rõ ràng** theo format `resource.action`
6. **Sử dụng route groups** để tránh lặp lại middleware
7. **Test kỹ permissions** cho từng role

## 8. Migration từ Code Cũ

### Trước (manual check trong controller):
```php
if (!in_array($request->user()->role, ['OPERATOR', 'ADMIN'])) {
    return response()->json(['message' => 'Unauthorized'], 403);
}
```

### Sau (sử dụng middleware):
```php
// routes/api.php
Route::middleware(['auth:sanctum', 'role:OPERATOR,ADMIN'])
    ->get('/users', [UserController::class, 'index']);

// Hoặc sử dụng trait trong controller
if (!$request->user()->canManageUsers()) {
    return response()->json(['message' => 'Unauthorized'], 403);
}
```

## 9. Troubleshooting

### Lỗi "Unauthenticated"
- Kiểm tra user đã đăng nhập chưa (`auth:sanctum` middleware)
- Kiểm tra token có hợp lệ không

### Lỗi "Unauthorized"
- Kiểm tra role của user: `$user->role`
- Kiểm tra permissions: `$user->getPermissions()`
- Xem logs tại `storage/logs/laravel.log`

### Permission không hoạt động
- Đảm bảo permissions trong middleware và trait giống nhau
- Kiểm tra spelling của permission name
- Xem logs để debug

---

**Tài liệu này được tạo tự động bởi Claude Code**
**Ngày tạo: 2025-11-27**
