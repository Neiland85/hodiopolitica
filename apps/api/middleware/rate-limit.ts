// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import rateLimit from "express-rate-limit";
import { getConfig } from "../../../packages/engine/config/config";

/**
 * API rate limiter.
 *
 * Defaults: 100 requests per 15-minute window per IP.
 * The /api/health endpoint is exempt (used by monitoring/healthchecks).
 * Disabled in test environment to avoid breaking integration tests.
 */
export function createRateLimiter() {
  const config = getConfig();

  // Skip rate limiting in test environment
  if (config.env === "test") {
    return (_req: unknown, _res: unknown, next: () => void) => next();
  }

  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
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
