/**
 * Custom hook for Google OAuth login
 */

import { useState } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { getGoogleAuthUrl } from '../api/authApi'

interface UseGoogleAuthResult {
  loginWithGoogle: () => Promise<void>
  loading: boolean
  error: string | null
}

export const useGoogleAuth = (): UseGoogleAuthResult => {
  const { t } = useTranslation()
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
        const errorMessage = data.message || t('login.errors.googleConnectError')
        setError(errorMessage)
        message.error(errorMessage)
      }
    } catch (err) {
      const errorMessage = t('login.errors.generalError')
      setError(errorMessage)
      message.error(errorMessage)
      console.error('Google auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { loginWithGoogle, loading, error }
}
