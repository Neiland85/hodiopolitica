// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { NextFunction, Request, Response } from "express";
import { getSecurityConfig } from "../config/security-config";

/**
 * CORS middleware with configurable origins.
 *
 * CORS origins sourced from SecurityConfig (apps/api layer).
 * Uses process.env.NODE_ENV directly — no dependency on domain config.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const securityConfig = getSecurityConfig();
  const isDev = (process.env.NODE_ENV || "development") === "development";
  const origin = req.headers.origin || "";

  if (securityConfig.corsOrigins.includes(origin) || isDev) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
