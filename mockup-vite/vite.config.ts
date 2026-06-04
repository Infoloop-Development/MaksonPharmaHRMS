import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // different from production mams-web (5173) so they can run side-by-side
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
