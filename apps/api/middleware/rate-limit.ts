// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { createEvent } from "@hodiopolitica/engine/shared/events/domain-event";
import { eventBus } from "@hodiopolitica/engine/shared/events/event-bus";
import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { getSecurityConfig } from "../config/security-config";
import type { RateLimitExceededPayload } from "../events/security-events";
import { SecurityEventTypes } from "../events/security-events";

/**
 * API rate limiter.
 *
 * Defaults: 100 requests per 15-minute window per IP.
 * The /api/health endpoint is exempt (used by monitoring/healthchecks).
 * Disabled in test environment to avoid breaking integration tests.
 *
 * Publishes RateLimitExceeded events via EventBus when limits are hit.
 * Config sourced from SecurityConfig (apps/api layer).
 * Uses process.env.NODE_ENV directly — no dependency on domain config.
 */
export function createRateLimiter() {
  const securityConfig = getSecurityConfig();

  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === "test") {
    return (_req: unknown, _res: unknown, next: () => void) => next();
  }

  return rateLimit({
    windowMs: securityConfig.rateLimitWindowMs,
    max: securityConfig.rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health",
    handler: (req: Request, res, _next, options) => {
      // Publish rate limit event for audit trail
      const payload: RateLimitExceededPayload = {
        ip: req.ip,
        path: req.path,
        method: req.method,
        limit: securityConfig.rateLimitMax,
        windowMs: securityConfig.rateLimitWindowMs,
      };
      eventBus.publish(createEvent(SecurityEventTypes.RateLimitExceeded, "api.rate-limiter", payload));

      res.status(options.statusCode).json({
        error: "Too Many Requests",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later",
        timestamp: new Date().toISOString(),
      });
    },
  });
}
