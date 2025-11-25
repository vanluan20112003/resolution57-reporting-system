import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const token = localStorage.getItem('access_token')

  return (
    <div style={{ minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          token ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

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
