/**
 * Application Message Constants
 * Centralized messages for notifications, errors, success messages
 */

export const MESSAGES = {
  // Auth messages
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công!',
    LOGIN_FAILED: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!',
    LOGOUT_SUCCESS: 'Đăng xuất thành công!',
    UNAUTHORIZED: 'Bạn không có quyền truy cập. Vui lòng đăng nhập!',
    SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!',
    REGISTER_SUCCESS: 'Đăng ký tài khoản thành công!',
    REGISTER_FAILED: 'Đăng ký thất bại. Vui lòng thử lại!',
    PASSWORD_RESET_SUCCESS: 'Đặt lại mật khẩu thành công!',
    PASSWORD_RESET_FAILED: 'Đặt lại mật khẩu thất bại!',
  },

  // CRUD messages
  CRUD: {
    CREATE_SUCCESS: 'Tạo mới thành công!',
    CREATE_FAILED: 'Tạo mới thất bại!',
    UPDATE_SUCCESS: 'Cập nhật thành công!',
    UPDATE_FAILED: 'Cập nhật thất bại!',
    DELETE_SUCCESS: 'Xóa thành công!',
    DELETE_FAILED: 'Xóa thất bại!',
    DELETE_CONFIRM: 'Bạn có chắc chắn muốn xóa?',
  },

  // Validation messages
  VALIDATION: {
    REQUIRED: 'Trường này là bắt buộc!',
    EMAIL_INVALID: 'Email không hợp lệ!',
    PASSWORD_MIN_LENGTH: 'Mật khẩu phải có ít nhất {min} ký tự!',
    PASSWORD_MISMATCH: 'Mật khẩu không khớp!',
    PHONE_INVALID: 'Số điện thoại không hợp lệ!',
    URL_INVALID: 'URL không hợp lệ!',
    NUMBER_INVALID: 'Giá trị phải là số!',
    DATE_INVALID: 'Ngày tháng không hợp lệ!',
    FILE_SIZE_EXCEEDED: 'Kích thước file vượt quá giới hạn!',
    FILE_TYPE_INVALID: 'Loại file không được hỗ trợ!',
  },

  // Network messages
  NETWORK: {
    ERROR: 'Lỗi kết nối mạng. Vui lòng thử lại!',
    TIMEOUT: 'Yêu cầu timeout. Vui lòng thử lại!',
    SERVER_ERROR: 'Lỗi server. Vui lòng thử lại sau!',
    NOT_FOUND: 'Không tìm thấy tài nguyên!',
    BAD_REQUEST: 'Yêu cầu không hợp lệ!',
    FORBIDDEN: 'Bạn không có quyền thực hiện hành động này!',
  },

  // Resolution messages
  RESOLUTION: {
    CREATE_SUCCESS: 'Tạo nghị quyết thành công!',
    CREATE_FAILED: 'Tạo nghị quyết thất bại!',
    UPDATE_SUCCESS: 'Cập nhật nghị quyết thành công!',
    UPDATE_FAILED: 'Cập nhật nghị quyết thất bại!',
    DELETE_SUCCESS: 'Xóa nghị quyết thành công!',
    DELETE_FAILED: 'Xóa nghị quyết thất bại!',
    DELETE_CONFIRM: 'Bạn có chắc chắn muốn xóa nghị quyết này?',
    NOT_FOUND: 'Không tìm thấy nghị quyết!',
  },

  // Report messages
  REPORT: {
    GENERATE_SUCCESS: 'Tạo báo cáo thành công!',
    GENERATE_FAILED: 'Tạo báo cáo thất bại!',
    EXPORT_SUCCESS: 'Xuất báo cáo thành công!',
    EXPORT_FAILED: 'Xuất báo cáo thất bại!',
    DOWNLOAD_SUCCESS: 'Tải báo cáo thành công!',
    DOWNLOAD_FAILED: 'Tải báo cáo thất bại!',
  },

  // File upload messages
  UPLOAD: {
    SUCCESS: 'Tải file lên thành công!',
    FAILED: 'Tải file lên thất bại!',
    SIZE_EXCEEDED: 'Kích thước file vượt quá {max}MB!',
    TYPE_INVALID: 'Chỉ chấp nhận file: {types}',
    DRAG_DROP: 'Kéo thả file vào đây hoặc click để chọn',
    UPLOADING: 'Đang tải lên...',
  },

  // Loading messages
  LOADING: {
    DEFAULT: 'Đang tải...',
    DATA: 'Đang tải dữ liệu...',
    SAVING: 'Đang lưu...',
    DELETING: 'Đang xóa...',
    PROCESSING: 'Đang xử lý...',
    UPLOADING: 'Đang tải lên...',
  },

  // General messages
  GENERAL: {
    CONFIRM: 'Xác nhận',
    CANCEL: 'Hủy',
    SAVE: 'Lưu',
    DELETE: 'Xóa',
    EDIT: 'Sửa',
    CREATE: 'Tạo mới',
    CLOSE: 'Đóng',
    BACK: 'Quay lại',
    NEXT: 'Tiếp theo',
    SUBMIT: 'Gửi',
    SEARCH: 'Tìm kiếm',
    FILTER: 'Lọc',
    EXPORT: 'Xuất',
    IMPORT: 'Nhập',
    DOWNLOAD: 'Tải xuống',
    UPLOAD: 'Tải lên',
    VIEW: 'Xem',
    PREVIEW: 'Xem trước',
    PRINT: 'In',
    NO_DATA: 'Không có dữ liệu',
    NO_RESULTS: 'Không tìm thấy kết quả',
    EMPTY: 'Trống',
    ALL: 'Tất cả',
    NONE: 'Không có',
    YES: 'Có',
    NO: 'Không',
  },
} as const

/**
 * Get message with interpolation
 * @example
 * interpolate(MESSAGES.VALIDATION.PASSWORD_MIN_LENGTH, { min: 8 })
 * // Returns: 'Mật khẩu phải có ít nhất 8 ký tự!'
 */
export const interpolate = (message: string, params: Record<string, string | number>): string => {
  let interpolated = message

  Object.entries(params).forEach(([key, value]) => {
    interpolated = interpolated.replace(`{${key}}`, String(value))
  })

  return interpolated
}

// Export type
export type MessageKey = keyof typeof MESSAGES
