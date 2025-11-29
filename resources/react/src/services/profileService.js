import api from './api'

/**
 * Profile Service - Handle user profile operations
 * SECURITY: All endpoints require authentication token
 */

/**
 * Get current user's profile
 */
export const getProfile = async () => {
  // api.get already returns response.data from interceptor
  return await api.get('/profile')
}

/**
 * Update current user's profile
 * Only allowed fields: first_name, last_name, phone
 */
export const updateProfile = async (data) => {
  // api.put already returns response.data from interceptor
  return await api.put('/profile', data)
}

/**
 * Upload user avatar
 * @param {File} file - Image file (JPEG, PNG, GIF, max 2MB)
 */
export const uploadAvatar = async (file) => {
  const formData = new FormData()
  formData.append('avatar', file, file.name)

  // Use fetch API to upload file (axios has issues with FormData)
  const token = localStorage.getItem('access_token')
  const apiUrl = import.meta.env.VITE_API_URL || '/api/v1'

  const response = await fetch(`${apiUrl}/profile/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      // Don't set Content-Type - let browser set it with boundary
    },
    body: formData
  })

  const data = await response.json()

  if (!response.ok) {
    throw data
  }

  return data
}

/**
 * Delete user avatar
 */
export const deleteAvatar = async () => {
  // api.delete already returns response.data from interceptor
  return await api.delete('/profile/avatar')
}
