// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import helmet from "helmet";
import { getConfig } from "../../../packages/engine/config/config";
// Note: securityHeaders only needs `env` from AppConfig (not security-specific config)

/**
 * Security headers middleware powered by helmet.
 *
 * In production: strict CSP, HSTS with preload, referrer policy.
 * In development: CSP disabled to allow hot-reload and devtools.
 */
export function securityHeaders() {
  const config = getConfig();
  const isDev = config.env === "development";

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
