import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    port: 5180,
    // The Ship-Of-Theseus FastAPI backend (uvicorn server:app --port 8000)
    proxy: { '/api': 'http://localhost:8000' },
  },
})