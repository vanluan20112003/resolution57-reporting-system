import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import './App.css'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Layout.Header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <h1 style={{
          color: 'white',
          margin: '16px 0',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          🏛️ Cổng thông tin Nghị quyết 57
        </h1>
      </Layout.Header>

      <Layout.Content style={{ padding: '24px', minHeight: 'calc(100vh - 134px)' }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          padding: '24px'
        }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Thêm các routes khác ở đây */}
          </Routes>
        </div>
      </Layout.Content>

      <Layout.Footer style={{
        textAlign: 'center',
        background: '#f0f2f5',
        borderTop: '1px solid #d9d9d9'
      }}>
        Cổng thông tin Nghị quyết 57 ©{new Date().getFullYear()} | Phát triển bởi NQ57 Team
      </Layout.Footer>
    </Layout>
  )
}

export default App
