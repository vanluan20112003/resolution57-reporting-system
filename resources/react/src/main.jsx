import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import 'dayjs/locale/en'
import App from './App.jsx'
import './index.css'
import i18n from './i18n' // Import i18n configuration
import { disableDevTools, disableConsole } from './utils/antiDevTools'

// Chỉ enable protection trong production
if (import.meta.env.PROD) {
  disableDevTools()
  disableConsole()
}

// Cấu hình React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Cấu hình theme Ant Design
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
}

// App wrapper to handle locale changes
function AppWrapper() {
  const [locale, setLocale] = useState(i18n.language === 'en' ? enUS : viVN)

  useEffect(() => {
    // Sync dayjs and Ant Design locale with i18n
    const handleLanguageChange = (lng) => {
      dayjs.locale(lng)
      setLocale(lng === 'en' ? enUS : viVN)
    }

    // Set initial locale
    handleLanguageChange(i18n.language)

    // Listen to language changes
    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  return (
    <ConfigProvider locale={locale} theme={theme}>
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
    </QueryClientProvider>
  </BrowserRouter>,
)
