import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // The DB stores images as /uploads/<name>.webp, relative to the site.
    // BACKEND_URL is set by the dev compose file, where the API is not on localhost.
    proxy: {
      '/uploads': process.env.BACKEND_URL ?? 'http://localhost:5000',
    },
  },
})
