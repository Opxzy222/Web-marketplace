// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        // Enable legacy decorators (most common in React + TypeScript apps)
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          '@babel/plugin-transform-class-properties'
        ]
      }
    })
  ],

  // Optional: if you still see performance issues or want faster HMR
  // You can add this (usually not necessary)
  optimizeDeps: {
    esbuildOptions: {
      // If you have any legacy decorator heavy dependencies
      target: 'es2020'
    }
  }
})