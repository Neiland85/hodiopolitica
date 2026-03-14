// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import rateLimit from "express-rate-limit";
import { getConfig } from "../../../packages/engine/config/config";
import { getSecurityConfig } from "../config/security-config";

/**
 * API rate limiter.
 *
 * Defaults: 100 requests per 15-minute window per IP.
 * The /api/health endpoint is exempt (used by monitoring/healthchecks).
 * Disabled in test environment to avoid breaking integration tests.
 *
 * Config sourced from SecurityConfig (apps/api layer), NOT domain config.
 */
export function createRateLimiter() {
  const appConfig = getConfig();
  const securityConfig = getSecurityConfig();

  // Skip rate limiting in test environment
  if (appConfig.env === "test") {
    return (_req: unknown, _res: unknown, next: () => void) => next();
  }

  return rateLimit({
    windowMs: securityConfig.rateLimitWindowMs,
    max: securityConfig.rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health",
    message: {
      error: "Too Many Requests",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
      timestamp: new Date().toISOString(),
    },
  });
}
