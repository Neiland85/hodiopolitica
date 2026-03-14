// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { ErrorResponse } from "@hodiopolitica/contracts";
import { createLogger } from "@hodiopolitica/engine/shared/logger/logger";
import type { NextFunction, Request, Response } from "express";

const logger = createLogger("api.error-handler");

/**
 * Global error handling middleware.
 *
 * Catches unhandled errors and returns a standardized JSON response.
 * Logs the full error server-side; returns a safe message client-side.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error("Unhandled error", {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  const response: ErrorResponse = {
    error: "Internal Server Error",
    code: "INTERNAL_ERROR",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
}
