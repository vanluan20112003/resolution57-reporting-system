/**
 * Custom hook for authentication state management
 * Provides current user data and authentication status
 */

import { useState, useEffect } from 'react'
import type { UserData } from '../../features/user'
import { enableDevToolsBypass } from '../../utils/antiDevTools'

interface UseAuthResult {
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = () => {
    try {
      const token = localStorage.getItem('access_token')
      const userStr = localStorage.getItem('user')

      if (token && userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)

        // Auto-enable DevTools bypass for ADMIN in production
        if (userData.role === 'ADMIN' && import.meta.env.PROD) {
          // Only enable if not already enabled (to avoid reload loop)
          const existingBypass = localStorage.getItem('__dev_bypass__')
          if (!existingBypass) {
            enableDevToolsBypass(userData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse user data:', error)
      // Clear invalid data
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    loadUser()
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
  }
}
