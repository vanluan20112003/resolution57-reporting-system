/**
 * Custom hook for managing loading overlay state
 */

import { useState, useCallback } from 'react'

interface UseLoadingOverlayResult {
  isLoading: boolean
  loadingMessage: string
  showLoading: (message?: string) => void
  hideLoading: () => void
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    message?: string
  ) => Promise<T>
}

export function useLoadingOverlay(): UseLoadingOverlayResult {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...')

  const showLoading = useCallback((message = 'Đang xử lý...') => {
    setLoadingMessage(message)
    setIsLoading(true)
  }, [])

  const hideLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  /**
   * Wrapper function to execute async operation with loading overlay
   */
  const withLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      message = 'Đang xử lý...'
    ): Promise<T> => {
      try {
        showLoading(message)
        const result = await asyncFn()
        return result
      } finally {
        hideLoading()
      }
    },
    [showLoading, hideLoading]
  )

  return {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    withLoading,
  }
}
