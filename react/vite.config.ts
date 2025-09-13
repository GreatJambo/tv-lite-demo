import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// We keep the React app isolated under the `react/` folder
// and proxy API calls to the existing Node server at :3000.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
