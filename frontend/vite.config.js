/** Configure the static React tier and source-only DOM tests. */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: { host: '0.0.0.0', port: Number(env.DEV_PORT || 5173), strictPort: true },
    preview: { host: '0.0.0.0', port: Number(env.PREVIEW_PORT || 4173), strictPort: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testSetup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      clearMocks: true,
      maxWorkers: 1,
      minWorkers: 1
    }
  };
});
