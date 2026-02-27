import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'], // только тесты
    exclude: [
      'node_modules/',
      'generated/',
      'mock-server/',
      'e2e/',
      'src/test/',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      all: false, // <-- не считать все файлы, только те, что реально покрыты тестами
      include: ['src/**/*.{ts,tsx}'], // файлы, по которым хотим считать покрытие
      exclude: [
        'node_modules/',
        'generated/',
        'mock-server/',
        'e2e/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },
});
