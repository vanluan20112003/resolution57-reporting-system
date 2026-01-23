import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UserProfilePage from './pages/UserProfilePage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SharedFilesPage from './pages/SharedFilesPage'
import MaintenancePage from './pages/MaintenancePage'
import PublicBatchFilesPage from './pages/PublicBatchFilesPage'
import { getMaintenanceStatus } from './services/maintenanceApi'

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  // Read token directly from localStorage on each render
  // Don't use state to avoid re-render issues
  const token = localStorage.getItem('access_token')

  // Maintenance state
  const [maintenanceStatus, setMaintenanceStatus] = useState(null)
  const [checkingMaintenance, setCheckingMaintenance] = useState(true)

  // Check maintenance status
  const checkMaintenance = useCallback(async () => {
    try {
      const status = await getMaintenanceStatus()
      console.log('Maintenance status:', status) // Debug log
      setMaintenanceStatus(status)
    } catch (error) {
      // If API fails, assume no maintenance to not block users
      console.error('Failed to check maintenance status:', error)
      setMaintenanceStatus({ is_maintenance: false, has_bypass: false })
    } finally {
      setCheckingMaintenance(false)
    }
  }, [])

  useEffect(() => {
    checkMaintenance()

    // Re-check maintenance status periodically (every 30 seconds)
    const interval = setInterval(checkMaintenance, 30000)

    return () => clearInterval(interval)
  }, [checkMaintenance, token]) // Re-check when token changes (login/logout)

  // Show loading while checking maintenance
  if (checkingMaintenance) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  // Show maintenance page if in maintenance mode and user doesn't have bypass
  if (maintenanceStatus?.is_maintenance && !maintenanceStatus?.has_bypass) {
    return (
      <MaintenancePage
        status={maintenanceStatus}
        onBypassSuccess={checkMaintenance}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes - No auth required */}
        <Route path="/login" element={
          token ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        {/* Password Reset Routes */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Google OAuth Callback - No auth required */}
        <Route path="/auth/callback" element={<GoogleCallbackPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

        {/* Unauthorized Page - No auth required */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Public Batch Files - accessible via share token without auth */}
        <Route path="/batch-files/:token" element={<PublicBatchFilesPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        } />

        {/* Activity Detail - renders inside Dashboard with sidebar */}
        <Route path="/activities/:id" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        {/* Shared Files - accessible via share token */}
        <Route path="/shared/files/:token" element={
          <ProtectedRoute>
            <SharedFilesPage />
          </ProtectedRoute>
        } />

        {/* Home - redirect based on auth status */}
        <Route path="/" element={
          token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
