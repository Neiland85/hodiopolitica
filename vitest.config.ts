import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts'],
      exclude: ['packages/**/__tests__/**', 'packages/**/index.ts'],
    },
  },
})
