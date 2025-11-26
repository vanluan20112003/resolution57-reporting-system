/**
 * Custom hook for email/password login
 */

import { useState } from 'react'
import { message } from 'antd'
import { LoginCredentials } from '../api/authApi'
import API_CONFIG from '../../../config/api'

interface UseLoginResult {
  login: (credentials: LoginCredentials) => Promise<void>
  loading: boolean
  error: string | null
}

export const useLogin = (): UseLoginResult => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_CONFIG.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      // Handle different error cases with specific messages
      if (!response.ok) {
        let errorMessage = 'Đăng nhập thất bại'

        // 401 - Invalid credentials
        if (response.status === 401) {
          errorMessage = '❌ Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.'
        }
        // 403 - Account inactive
        else if (response.status === 403) {
          errorMessage = '🚫 Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
        }
        // 422 - Validation error
        else if (response.status === 422) {
          if (data.errors?.email) {
            errorMessage = '📧 Email không hợp lệ. Vui lòng nhập đúng định dạng email.'
          } else if (data.errors?.password) {
            errorMessage = '🔐 Mật khẩu phải có ít nhất 6 ký tự.'
          } else {
            errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.'
          }
        }
        // 500 - Server error
        else if (response.status >= 500) {
          errorMessage = '⚠️ Lỗi hệ thống. Vui lòng thử lại sau.'
        }
        // Use server message if available
        else if (data.message) {
          errorMessage = data.message
        }

        setError(errorMessage)
        message.error(errorMessage, 5) // Show for 5 seconds
        setLoading(false)
        return
      }

      // Success case
      if (data.success && data.data) {
        // Store authentication data
        localStorage.setItem('access_token', data.data.access_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        localStorage.setItem('token_type', data.data.token_type)

        message.success('✅ Đăng nhập thành công!', 2)

        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500))

        // Redirect to dashboard
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      // Network or connection errors
      let errorMessage = '⚠️ Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'

      if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = '🌐 Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.'
      }

      setError(errorMessage)
      message.error(errorMessage, 5)
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  return { login, loading, error }
}
