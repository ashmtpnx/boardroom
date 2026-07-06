import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Split big third-party libs into their own chunks so they load in parallel
    // and stay cached across deploys (they change far less often than app code).
    // Fabric is additionally lazy-loaded (see App.jsx), so it only downloads on a
    // board — not on the login/home screens.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('fabric')) return 'fabric';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'export';
          if (id.includes('socket.io')) return 'socket';
          if (/[\\/]react|redux|react-redux|@reduxjs/.test(id)) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
});
