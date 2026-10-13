import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 180000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'app.js',
        'config/**/*.js',
        'controllers/**/*.js',
        'middleware/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
        'services/**/*.js',
        'utils/**/*.js',
        'validation/**/*.js',
      ],
      exclude: ['**/*.test.js'],
      thresholds: {
        statements: 60,
        branches: 45,
        functions: 60,
        lines: 65,
      },
    },
  },
});
