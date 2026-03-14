// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Security domain events — published via EventBus for unified audit trail.
 *
 * These live in apps/api (infrastructure layer), not in packages/engine (domain),
 * because they represent infrastructure-level concerns, not domain facts.
 */

/** Emitted when a request triggers rate limit enforcement. */
export interface RateLimitExceededPayload {
  ip: string | undefined;
  path: string;
  method: string;
  limit: number;
  windowMs: number;
}

/** Emitted on 4xx/5xx responses for security audit trail. */
export interface SecurityAuditPayload {
  method: string;
  path: string;
  status: number;
  ip: string | undefined;
  userAgent: string | undefined;
  correlationId: string | undefined;
}

/**
 * Security event type constants.
 * Kept separate from PolicyEventTypes (domain events) to preserve bounded context boundaries.
 */
export const SecurityEventTypes = {
  RateLimitExceeded: "RateLimitExceeded",
  SecurityAudit: "SecurityAudit",
} as const;

export type SecurityEventType = (typeof SecurityEventTypes)[keyof typeof SecurityEventTypes];
