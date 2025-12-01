/**
 * Custom hook for authentication state management
 * Provides current user data and authentication status
 *
 * Features:
 * - Auto-refresh user data every 30 seconds to detect permission changes
 * - Syncs localStorage with API data for role/organization changes
 * - Handles visibility change to refresh when user returns to tab
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { UserData } from '../../features/user'
import { enableDevToolsBypass } from '../../utils/antiDevTools'
import { getProfile } from '../../services/profileService'

// Refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30 * 1000

interface UseAuthResult {
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastRefreshRef = useRef<number>(0)
  const isRefreshingRef = useRef<boolean>(false)

  // Sync user data from API and detect changes
  const syncUserFromAPI = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access_token')
    if (!token) return false

    // Throttle API calls - minimum 10 seconds between calls unless forced
    const now = Date.now()
    if (!forceRefresh && now - lastRefreshRef.current < 10000) {
      return false
    }

    // Prevent concurrent refresh calls
    if (isRefreshingRef.current) return false
    isRefreshingRef.current = true

    try {
      const profileResponse = await getProfile()
      const profileData = profileResponse.success ? profileResponse.data : profileResponse

      if (profileData) {
        const userStr = localStorage.getItem('user')
        const currentUserData = userStr ? JSON.parse(userStr) : {}

        // Check if critical fields have changed
        const hasRoleChanged = currentUserData.role !== profileData.role
        const hasOrgChanged = currentUserData.organization_id !== profileData.organization_id
        const hasNameChanged = currentUserData.name !== `${profileData.first_name} ${profileData.last_name}`

        if (hasRoleChanged || hasOrgChanged || hasNameChanged || forceRefresh) {
          // Update user data with fresh API data
          const updatedUserData = {
            ...currentUserData,
            id: profileData.id,
            name: `${profileData.first_name} ${profileData.last_name}`,
            email: profileData.email,
            role: profileData.role,
            avatar: profileData.avatar,
            avatar_url: profileData.avatar_url,
            organization_id: profileData.organization_id,
            organization_name: profileData.organization?.short_name || profileData.organization?.name || null,
            organization_full_name: profileData.organization?.name || null,
            _lastSync: now,
          }

          // Save to localStorage
          localStorage.setItem('user', JSON.stringify(updatedUserData))

          // Update state
          setUser(updatedUserData)

          lastRefreshRef.current = now
          return true
        }
      }

      lastRefreshRef.current = now
      return false
    } catch (error) {
      console.error('Failed to sync user data from API:', error)
      return false
    } finally {
      isRefreshingRef.current = false
    }
  }, [])

  // Initial load from localStorage, then sync from API
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const userStr = localStorage.getItem('user')

      if (token && userStr) {
        let userData = JSON.parse(userStr)

        // Set initial user data from localStorage immediately
        setUser(userData)

        // Then sync from API in background
        await syncUserFromAPI(true)

        // Re-read updated data
        const updatedUserStr = localStorage.getItem('user')
        if (updatedUserStr) {
          userData = JSON.parse(updatedUserStr)
          setUser(userData)
        }

        // Auto-enable DevTools bypass for ADMIN in production
        if (userData.role === 'ADMIN' && import.meta.env.PROD) {
          const existingBypass = localStorage.getItem('__dev_bypass__')
          if (!existingBypass) {
            enableDevToolsBypass(userData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse user data:', error)
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }, [syncUserFromAPI])

  // Initial load
  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Auto-refresh interval
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const intervalId = setInterval(() => {
      syncUserFromAPI(false)
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [syncUserFromAPI])

  // Refresh when tab becomes visible (user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('access_token')
        if (token) {
          // Delay slightly to avoid race conditions
          setTimeout(() => syncUserFromAPI(false), 500)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [syncUserFromAPI])

  // Manual refresh function
  const refreshUser = useCallback(async () => {
    await syncUserFromAPI(true)
  }, [syncUserFromAPI])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
  }
}
