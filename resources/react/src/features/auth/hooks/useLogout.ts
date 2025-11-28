/**
 * Custom hook for logout functionality
 */

import { useState } from 'react'
import { logout as logoutApi } from '../api/authApi'
import { disableDevToolsBypass } from '../../../utils/antiDevTools'

interface UseLogoutResult {
  logout: () => Promise<void>
  loading: boolean
}

export const useLogout = (): UseLogoutResult => {
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      // Call logout API (don't wait for response)
      if (token) {
        await logoutApi(token)
      }

      // Clear local storage immediately
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      localStorage.removeItem('token_type')

      // Clear DevTools bypass for ADMIN (without reload since we're redirecting)
      localStorage.removeItem('__dev_bypass__')

      // Force redirect to login page with page reload
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)

      // Even if error, still clear and redirect
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  return { logout, loading }
}
