/**
 * Centralized configuration module.
 *
 * All config is derived from environment variables with sensible defaults.
 * This prevents hardcoded values scattered across the codebase.
 */

export interface AppConfig {
  /** Server port for the API */
  port: number
  /** Node environment: development | production | test */
  env: 'development' | 'production' | 'test'
  /** Minimum log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** Path to the data/sources directory */
  dataDir: string
  /** Allowed CORS origins */
  corsOrigins: string[]
}

let cachedConfig: AppConfig | null = null

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig

  const env = (process.env.NODE_ENV || 'development') as AppConfig['env']

  cachedConfig = {
    port: parseInt(process.env.PORT || '3001', 10),
    env,
    logLevel: (process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug')) as AppConfig['logLevel'],
    dataDir: process.env.DATA_DIR || 'data/sources',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((s) => s.trim()),
  }

  return cachedConfig
}

/**
 * Resets cached config — used in tests to override environment.
 */
export function resetConfig(): void {
  cachedConfig = null
}
