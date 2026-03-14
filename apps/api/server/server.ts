// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type {
  CompareCountriesRequest,
  CompareCountriesResponse,
  CountriesResponse,
  ErrorResponse,
  EvaluatePolicyRequest,
  EvaluatePolicyResponse,
  HealthResponse,
} from "@hodiopolitica/contracts";
import type { CompareCountriesUseCase } from "@hodiopolitica/engine/application/compare-countries.usecase";
import type { EvaluatePolicyUseCase } from "@hodiopolitica/engine/application/evaluate-policy.usecase";
import type { ListCountriesUseCase } from "@hodiopolitica/engine/application/list-countries.usecase";
import { getConfig } from "@hodiopolitica/engine/config/config";
import type { PolicyDecision, PolicyDomain } from "@hodiopolitica/engine/policy/policy-decision";
import type { EconomicContextRepository } from "@hodiopolitica/engine/repositories/economic-context-repository";
import { bootstrapContainer, DI } from "@hodiopolitica/engine/shared/container/composition-root";
import { createLogger } from "@hodiopolitica/engine/shared/logger/logger";
import type { Request, Response } from "express";
import express from "express";
import { getSecurityConfig } from "../config/security-config";
import { auditLogger } from "../middleware/audit-logger";
import { corsMiddleware } from "../middleware/cors";
import { errorHandler } from "../middleware/error-handler";
import { createRateLimiter } from "../middleware/rate-limit";
import { requestLogger } from "../middleware/request-logger";
import { securityHeaders } from "../middleware/security-headers";
import { validateCompareCountries, validateEvaluatePolicy } from "../middleware/validate";

const logger = createLogger("api.server");
const config = getConfig();
const securityConfig = getSecurityConfig();

// ─── Composition Root ───────────────────────────────────────
const container = bootstrapContainer();
const evaluateUC = container.resolve<EvaluatePolicyUseCase>(DI.EvaluatePolicy);
const listCountriesUC = container.resolve<ListCountriesUseCase>(DI.ListCountries);
const compareUC = container.resolve<CompareCountriesUseCase>(DI.CompareCountries);
const contextRepo = container.resolve<EconomicContextRepository>(DI.ContextRepo);

// ─── Express App ────────────────────────────────────────────
const app = express();

if (securityConfig.trustProxy) {
  app.set("trust proxy", 1);
}

// ─── Security Middleware ──────────────────────────────────
app.use(securityHeaders());
app.use(createRateLimiter());
app.use(corsMiddleware);
app.use(express.json({ limit: securityConfig.bodyMaxSize }));
app.use(requestLogger);
app.use(auditLogger);

const startTime = Date.now();

// ─── GET /api/health ────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  const uptimeMs = Date.now() - startTime;
  const dataProbe = contextRepo.listAvailableCountries();

  const response: HealthResponse & {
    uptime: string;
    checks: Record<string, { status: string; detail?: string }>;
  } = {
    status: dataProbe.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: `${Math.floor(uptimeMs / 1000)}s`,
    checks: {
      dataSource: dataProbe.ok
        ? { status: "ok", detail: `${dataProbe.value.length} countries available` }
        : { status: "error", detail: dataProbe.error.message },
    },
  };

  res.status(dataProbe.ok ? 200 : 503).json(response);
});

// ─── GET /api/countries ─────────────────────────────────────
app.get("/api/countries", (_req: Request, res: Response) => {
  const result = listCountriesUC.execute();

  if (!result.ok) {
    res.status(500).json({
      error: "Data Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  res.json({ countries: result.value } satisfies CountriesResponse);
});

// ─── GET /api/policy/evaluate?country=spain ─────────────────
app.get("/api/policy/evaluate", (req: Request, res: Response) => {
  const country = (req.query.country as string) || "spain";

  const policy: PolicyDecision = {
    id: "housing-law-2023",
    title: "Ley de Vivienda",
    description: "Regulaci\u00f3n del mercado del alquiler",
    date: new Date("2023-05-25"),
    actors: ["gobierno", "parlamento"],
    objectives: ["reducir coste vivienda", "regular mercado alquiler"],
    domain: "housing",
  };

  const result = evaluateUC.execute({
    policy,
    country,
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    res.status(result.error.code === "DATA_SOURCE_ERROR" ? 404 : 500).json({
      error: "Evaluation Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  res.json(result.value satisfies EvaluatePolicyResponse);
});

// ─── POST /api/policy/evaluate ──────────────────────────────
app.post("/api/policy/evaluate", validateEvaluatePolicy, (req: Request, res: Response) => {
  const body = req.body as EvaluatePolicyRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const result = evaluateUC.execute({
    policy,
    country: body.country || "spain",
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    const statusCode = result.error.code === "DATA_SOURCE_ERROR" ? 404 : 500;
    res.status(statusCode).json({
      error: "Evaluation Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  res.json(result.value satisfies EvaluatePolicyResponse);
});

// ─── POST /api/policy/compare ───────────────────────────────
app.post("/api/policy/compare", validateCompareCountries, (req: Request, res: Response) => {
  const body = req.body as CompareCountriesRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const result = compareUC.execute({
    policy,
    countries: body.countries,
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    res.status(400).json({
      error: "Comparison Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  res.json(result.value satisfies CompareCountriesResponse);
});

// ─── Error handler (must be last) ───────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────
if (require.main === module) {
  app.listen(config.port, () => {
    logger.info("Server started", {
      port: config.port,
      env: config.env,
      dependencies: container.list(),
      endpoints: [
        "GET  /api/health",
        "GET  /api/countries",
        "GET  /api/policy/evaluate?country=spain",
        "POST /api/policy/evaluate",
        "POST /api/policy/compare",
      ],
    });
  });
}

export { app, container };
