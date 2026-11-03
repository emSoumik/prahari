import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // The Ship-Of-Theseus FastAPI backend (uvicorn server:app --port 8000)
    proxy: { '/api': 'http://localhost:8000' },
  },
})
