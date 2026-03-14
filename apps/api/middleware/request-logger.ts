// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { NextFunction, Request, Response } from "express";
import { createLogger } from "../../../packages/engine/shared/logger/logger";

const logger = createLogger("api.http");

/**
 * HTTP request logging middleware.
 *
 * Logs method, URL, status code, and response time for every request.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
