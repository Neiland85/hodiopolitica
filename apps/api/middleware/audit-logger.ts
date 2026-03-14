// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { createEvent } from "@hodiopolitica/engine/shared/events/domain-event";
import { eventBus } from "@hodiopolitica/engine/shared/events/event-bus";
import { createLogger } from "@hodiopolitica/engine/shared/logger/logger";
import type { NextFunction, Request, Response } from "express";
import type { SecurityAuditPayload } from "../events/security-events";
import { SecurityEventTypes } from "../events/security-events";

const auditLog = createLogger("api.audit");

/**
 * Security audit logging middleware.
 *
 * Logs security-relevant events (4xx/5xx) AND publishes them
 * via EventBus for unified audit trail and subscriber extensibility.
 *
 * Dual output:
 *   - Structured log (immediate, stdout) for ops/monitoring
 *   - Domain event (EventBus) for subscribers (metrics, alerting, etc.)
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      const payload: SecurityAuditPayload = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        correlationId: req.headers["x-correlation-id"] as string | undefined,
      };

      // Structured log for immediate visibility
      auditLog.warn("Security-relevant response", { ...payload });

      // Publish to EventBus for subscribers (metrics, alerting)
      eventBus.publish(
        createEvent(SecurityEventTypes.SecurityAudit, "api.audit-middleware", payload, payload.correlationId),
      );
    }
  });

  next();
}
