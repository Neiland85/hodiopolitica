// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Security configuration — isolated from domain config.
 *
 * Infrastructure concern: rate limiting, CORS, body limits, proxy trust.
 * This module owns its own env var parsing, independent of packages/engine.
 */

export interface SecurityConfig {
  /** Rate limit: max requests per window */
  rateLimitMax: number;
  /** Rate limit: window duration in ms */
  rateLimitWindowMs: number;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** Maximum JSON body size (e.g. '10kb') */
  bodyMaxSize: string;
  /** Trust proxy header (for rate limiting behind reverse proxy) */
  trustProxy: boolean;
}

let cachedSecurityConfig: SecurityConfig | null = null;

export function getSecurityConfig(): SecurityConfig {
  if (cachedSecurityConfig) return cachedSecurityConfig;

  cachedSecurityConfig = {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
      .split(",")
      .map((s) => s.trim()),
    bodyMaxSize: process.env.BODY_MAX_SIZE || "10kb",
    trustProxy: process.env.TRUST_PROXY === "true",
  };

  return cachedSecurityConfig;
}

/**
 * Resets cached security config — used in tests.
 */
export function resetSecurityConfig(): void {
  cachedSecurityConfig = null;
}
