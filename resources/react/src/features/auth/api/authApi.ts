/**
 * Authentication API Layer
 * Handles all API calls related to authentication
 */

import API_CONFIG from '../../../config/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      avatar?: string | null
      avatar_url?: string | null
      role?: string
    }
    access_token: string
    token_type: string
  }
}

export interface GoogleAuthResponse {
  success: boolean
  url?: string
  message?: string
}

export interface UserResponse {
  success: boolean
  data?: {
    id: string
    name: string
    email: string
    avatar?: string | null
    avatar_url?: string | null
    role?: string
  }
  message?: string
}

/**
 * Login with email and password
 */
export const loginWithCredentials = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  const response = await fetch(API_CONFIG.AUTH.LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get Google OAuth redirect URL
 */
export const getGoogleAuthUrl = async (): Promise<GoogleAuthResponse> => {
  const response = await fetch(API_CONFIG.AUTH.GOOGLE_REDIRECT, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Exchange Google OAuth code for access token
 * SECURITY: This implements the secure authorization code flow
 */
export const exchangeGoogleCode = async (code: string): Promise<LoginResponse> => {
  const response = await fetch(API_CONFIG.AUTH.GOOGLE_EXCHANGE_CODE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Logout current user
 */
export const logout = async (token: string): Promise<void> => {
  try {
    await fetch(API_CONFIG.AUTH.LOGOUT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Logout API error:', error)
    // Don't throw - we still want to clear local storage even if API fails
  }
}

/**
 * Get current user information
 */
export const getCurrentUser = async (token: string): Promise<UserResponse> => {
  const response = await fetch(API_CONFIG.AUTH.ME, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
