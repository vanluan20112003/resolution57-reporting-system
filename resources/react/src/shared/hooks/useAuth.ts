/**
 * Custom hook for authentication state management
 * Provides current user data and authentication status
 */

import { useState, useEffect } from 'react'
import type { UserData } from '../../features/user'

interface UseAuthResult {
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token')
      const userStr = localStorage.getItem('user')

      if (token && userStr) {
        const userData = JSON.parse(userStr)
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to parse user data:', error)
      // Clear invalid data
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  }
}
