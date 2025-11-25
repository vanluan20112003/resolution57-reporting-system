/**
 * Application Configuration
 * General app settings and metadata
 */

export const appConfig = {
  // App Info
  name: 'NQ57 Portal',
  fullName: 'Hệ thống Thông tin Giám sát, Đánh giá việc thực hiện Nghị quyết số 57-NQ/TW',
  shortName: 'NQ57',
  description: 'Cổng thông tin tổng hợp các hoạt động Nghị quyết 57',
  version: '1.0.0',

  // Organization
  organization: {
    name: 'ĐHQG TP.HCM',
    fullName: 'Đại học Quốc gia Thành phố Hồ Chí Minh',
    website: 'https://vnuhcm.edu.vn',
    logo: 'https://pms.vnuhcm.edu.vn/logo.png',
  },

  // Contact
  contact: {
    email: 'support@vnuhcm.edu.vn',
    phone: '(028) 3724 4173',
    address: 'Khu phố 6, Phường Linh Trung, Thành phố Thủ Đức, Thành phố Hồ Chí Minh',
  },

  // Features
  features: {
    enableSSO: true,
    enableNotifications: true,
    enableDarkMode: false,
    enableAnalytics: true,
    enableExport: true,
    enableImport: true,
    enableFileUpload: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
  },

  // UI Settings
  ui: {
    defaultTheme: 'light',
    defaultLanguage: 'vi',
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
    timeFormat: 'HH:mm:ss',
    currency: 'VND',
    currencySymbol: '₫',
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: true,
  },

  // Table Settings
  table: {
    bordered: false,
    striped: false,
    hoverable: true,
    size: 'middle',
  },

  // Links
  links: {
    homepage: '/',
    dashboard: '/dashboard',
    login: '/login',
    documentation: '/docs',
    support: '/support',
    github: 'https://github.com/vanluan20112003/resolution57-reporting-system',
  },

  // Environment
  env: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE,
  },
} as const

// Export type
export type AppConfig = typeof appConfig
