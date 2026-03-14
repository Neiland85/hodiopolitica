// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Centralized configuration module.
 *
 * All config is derived from environment variables with sensible defaults.
 * This prevents hardcoded values scattered across the codebase.
 */

export interface AppConfig {
  /** Server port for the API */
  port: number;
  /** Node environment: development | production | test */
  env: "development" | "production" | "test";
  /** Minimum log level */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Path to the data/sources directory */
  dataDir: string;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** Rate limit: max requests per window */
  rateLimitMax: number;
  /** Rate limit: window duration in ms */
  rateLimitWindowMs: number;
  /** Maximum JSON body size (e.g. '10kb') */
  bodyMaxSize: string;
  /** Trust proxy header (for rate limiting behind reverse proxy) */
  trustProxy: boolean;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const env = (process.env.NODE_ENV || "development") as AppConfig["env"];

  cachedConfig = {
    port: parseInt(process.env.PORT || "3001", 10),
    env,
    logLevel: (process.env.LOG_LEVEL || (env === "production" ? "info" : "debug")) as AppConfig["logLevel"],
    dataDir: process.env.DATA_DIR || "data/sources",
    corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
      .split(",")
      .map((s) => s.trim()),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    bodyMaxSize: process.env.BODY_MAX_SIZE || "10kb",
    trustProxy: process.env.TRUST_PROXY === "true",
  };

  return cachedConfig;
}

/**
 * Resets cached config — used in tests to override environment.
 */
export function resetConfig(): void {
  cachedConfig = null;
}
