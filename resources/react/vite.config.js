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
    outDir: 'dist',
    emptyOutDir: true,
    manifest: false,
    // Minify với esbuild (an toàn hơn terser)
    minify: 'esbuild',
    // Drop console và debugger với esbuild
    esbuild: {
      drop: ['console', 'debugger'],
    },
    terserOptions: {
      compress: {
        drop_console: true,        // Xóa console.log
        drop_debugger: true,        // Xóa debugger
        passes: 2,                  // Giảm số lần nén để tránh break code
      },
      mangle: {
        toplevel: false,            // Không đổi tên biến toàn cục
        // properties: false,       // Tắt mangle properties để tránh break
      },
      format: {
        comments: false,            // Xóa tất cả comments
      },
    },
    // Tắt source maps (quan trọng!)
    sourcemap: false,
    // Tối ưu CSS
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      input: './index.html',
      output: {
        // Tạo tên file ngẫu nhiên
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Đơn giản hóa chunks để tránh lỗi
        manualChunks: undefined,
      },
    },
  },
})
