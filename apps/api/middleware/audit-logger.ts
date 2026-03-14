// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { NextFunction, Request, Response } from "express";
import { createLogger } from "../../../packages/engine/shared/logger/logger";

const auditLog = createLogger("api.audit");

/**
 * Security audit logging middleware.
 *
 * Logs security-relevant events: 4xx/5xx responses with IP,
 * user-agent, and correlation ID for forensic analysis.
 * Follows the project's JSON structured logging format.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      auditLog.warn("Security-relevant response", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        correlationId: req.headers["x-correlation-id"] as string,
      });
    }
  });

  next();
}
