// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import helmet from "helmet";

/**
 * Security headers middleware powered by helmet.
 *
 * In production: strict CSP, HSTS with preload, referrer policy.
 * In development: CSP disabled to allow hot-reload and devtools.
 *
 * Uses process.env.NODE_ENV directly — no dependency on domain config.
 */
export function securityHeaders() {
  const isDev = (process.env.NODE_ENV || "development") === "development";

  return helmet({
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
  });
}
