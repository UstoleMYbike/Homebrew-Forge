import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// The published-artifact build: same app, Claude as the model. No service
// worker or manifest (a published page can use neither), and one entry that
// scripts/make-artifact.mjs then inlines into a single file.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'import.meta.env.VITE_TARGET': JSON.stringify('artifact') },
  publicDir: false,
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: resolve(import.meta.dirname, 'artifact.html') },
  },
})
