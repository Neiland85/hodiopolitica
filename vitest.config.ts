// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts', 'apps/api/**/*.ts'],
      exclude: ['packages/**/__tests__/**', 'apps/**/__tests__/**', 'packages/**/index.ts'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})