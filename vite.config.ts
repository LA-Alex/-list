import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife', // 重要！kintone 需要 iife 格式
        entryFileNames: 'app.js', // 輸出單一檔案
      }
    }
  }
})