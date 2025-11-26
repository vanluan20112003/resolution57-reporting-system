import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

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

  return (
    <div style={{ minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes - No auth required */}
        <Route path="/login" element={
          token ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        {/* Google OAuth Callback - No auth required */}
        <Route path="/auth/callback" element={<GoogleCallbackPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

        {/* Unauthorized Page - No auth required */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
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
