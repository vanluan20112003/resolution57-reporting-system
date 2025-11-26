/**
 * Custom hook for Google OAuth login
 */

import { useState } from 'react'
import { message } from 'antd'
import { getGoogleAuthUrl } from '../api/authApi'

interface UseGoogleAuthResult {
  loginWithGoogle: () => Promise<void>
  loading: boolean
  error: string | null
}

export const useGoogleAuth = (): UseGoogleAuthResult => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getGoogleAuthUrl()

      if (data.success && data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url
      } else {
        const errorMessage = data.message || 'Không thể kết nối với Google'
        setError(errorMessage)
        message.error(errorMessage)
      }
    } catch (err) {
      const errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.'
      setError(errorMessage)
      message.error(errorMessage)
      console.error('Google auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { loginWithGoogle, loading, error }
}
