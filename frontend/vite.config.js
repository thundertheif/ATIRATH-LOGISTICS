import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path" // 👈 Add this line

export default defineConfig({
  plugins: [react()],
  resolve: { // 👈 Add this block
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})