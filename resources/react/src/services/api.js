import axios from 'axios'

// Cấu hình base URL cho API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Tạo axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Request interceptor - Thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Xử lý lỗi
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      // Server trả về lỗi
      const { status, data } = error.response

      switch (status) {
        case 401:
          // Unauthorized - Xóa token và redirect to login
          localStorage.removeItem('access_token')
          window.location.href = '/login'
          break
        case 403:
          // Forbidden
          console.error('Bạn không có quyền truy cập')
          break
        case 404:
          // Not found
          console.error('Không tìm thấy tài nguyên')
          break
        case 422:
          // Validation error
          console.error('Lỗi validation:', data.errors)
          break
        case 500:
          // Server error
          console.error('Lỗi server')
          break
        default:
          console.error('Có lỗi xảy ra:', data.message || error.message)
      }

      return Promise.reject(error.response.data)
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      console.error('Không thể kết nối đến server')
      return Promise.reject({ message: 'Không thể kết nối đến server' })
    } else {
      // Lỗi khác
      console.error('Lỗi:', error.message)
      return Promise.reject({ message: error.message })
    }
  }
)

export default api
