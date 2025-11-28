import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../../public/build',
    emptyOutDir: true,
    manifest: true,
    // Minify và obfuscate code
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,        // Xóa console.log
        drop_debugger: true,        // Xóa debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Xóa các console functions
        passes: 3,                  // Số lần nén (càng nhiều càng khó đọc)
      },
      mangle: {
        toplevel: true,             // Đổi tên biến toàn cục
        properties: {
          regex: /^_/,              // Đổi tên properties bắt đầu bằng _
        },
      },
      format: {
        comments: false,            // Xóa tất cả comments
        ascii_only: true,           // Chỉ dùng ASCII
      },
    },
    // Tắt source maps (quan trọng!)
    sourcemap: false,
    // Tối ưu CSS
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      input: './src/main.jsx',
      output: {
        // Tạo tên file ngẫu nhiên
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Tách code thành nhiều chunks nhỏ
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Tách vendor thành nhiều chunks nhỏ
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('antd')) {
              return 'antd-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})
