import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor-vendor': ['@monaco-editor/react', '@excalidraw/excalidraw'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', '@dnd-kit/core', '@dnd-kit/sortable'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
