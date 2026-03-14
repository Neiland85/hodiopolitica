// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type {
  ActorAnalysisRequest,
  ActorAnalysisResponse,
  CompareCountriesRequest,
  CompareCountriesResponse,
  CountriesResponse,
  ErrorResponse,
  EvaluatePolicyRequest,
  EvaluatePolicyResponse,
  FullEvaluationRequest,
  FullEvaluationResponse,
  HealthResponse,
  MediaAnalysisRequest,
  MediaAnalysisResponse,
  ScenarioRequest,
  ScenarioResponse,
} from "@hodiopolitica/contracts";
import type { AnalyzeActorsUseCase } from "@hodiopolitica/engine/application/analyze-actors.usecase";
import type { AnalyzeMediaUseCase } from "@hodiopolitica/engine/application/analyze-media.usecase";
import type { CompareCountriesUseCase } from "@hodiopolitica/engine/application/compare-countries.usecase";
import type { EvaluatePolicyUseCase } from "@hodiopolitica/engine/application/evaluate-policy.usecase";
import type {
  FullEvaluationUseCase,
  PipelineStageName,
} from "@hodiopolitica/engine/application/full-evaluation.usecase";
import type { ListCountriesUseCase } from "@hodiopolitica/engine/application/list-countries.usecase";
import type { RunScenariosUseCase } from "@hodiopolitica/engine/application/run-scenarios.usecase";
import { getConfig } from "@hodiopolitica/engine/config/config";
import type { PolicyDecision, PolicyDomain } from "@hodiopolitica/engine/policy/policy-decision";
import type { ActorRepository } from "@hodiopolitica/engine/repositories/actor-repository";
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
import {
  validateActorAnalysis,
  validateCompareCountries,
  validateEvaluatePolicy,
  validateFullEvaluation,
  validateMediaAnalysis,
  validateScenarioRun,
} from "../middleware/validate";

const logger = createLogger("api.server");
const config = getConfig();
const securityConfig = getSecurityConfig();

// ─── Composition Root ───────────────────────────────────────
const container = bootstrapContainer();
const evaluateUC = container.resolve<EvaluatePolicyUseCase>(DI.EvaluatePolicy);
const listCountriesUC = container.resolve<ListCountriesUseCase>(DI.ListCountries);
const compareUC = container.resolve<CompareCountriesUseCase>(DI.CompareCountries);
const contextRepo = container.resolve<EconomicContextRepository>(DI.ContextRepo);
const analyzeActorsUC = container.resolve<AnalyzeActorsUseCase>(DI.AnalyzeActors);
const analyzeMediaUC = container.resolve<AnalyzeMediaUseCase>(DI.AnalyzeMedia);
const fullEvaluationUC = container.resolve<FullEvaluationUseCase>(DI.FullEvaluation);
const runScenariosUC = container.resolve<RunScenariosUseCase>(DI.RunScenarios);
const actorRepo = container.resolve<ActorRepository>(DI.ActorRepo);

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

// ─── GET /api/actors?country=spain ──────────────────────────
app.get("/api/actors", (req: Request, res: Response) => {
  const country = req.query.country as string;

  if (!country) {
    res.status(400).json({
      error: "Validation Error",
      code: "INVALID_COUNTRY",
      message: "country query parameter is required",
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  const result = actorRepo.findByCountry(country);

  if (!result.ok) {
    res.status(404).json({
      error: "Data Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  res.json({
    country,
    actors: result.value.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      country: a.country,
    })),
  });
});

// ─── POST /api/actors/analyze ──────────────────────────────
app.post("/api/actors/analyze", validateActorAnalysis, (req: Request, res: Response) => {
  const body = req.body as ActorAnalysisRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const result = analyzeActorsUC.execute({
    policy,
    country: body.country,
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    res.status(result.error.code === "ACTOR_NOT_FOUND" ? 404 : 500).json({
      error: "Actor Analysis Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  const response: ActorAnalysisResponse = {
    influences: result.value.influences,
    alignmentScore: result.value.alignmentScore,
    supportBalance: result.value.supportBalance,
    dominantChannel: result.value.dominantChannel,
    analyzedAt: result.value.analyzedAt.toISOString(),
  };

  res.json(response);
});

// ─── POST /api/media/analyze ───────────────────────────────
app.post("/api/media/analyze", validateMediaAnalysis, (req: Request, res: Response) => {
  const body = req.body as MediaAnalysisRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const result = analyzeMediaUC.execute({
    policy,
    country: body.country,
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    res.status(result.error.code === "DATA_SOURCE_ERROR" ? 404 : 500).json({
      error: "Media Analysis Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  const response: MediaAnalysisResponse = {
    policy: result.value.policy,
    coverage: result.value.coverage,
    metrics: result.value.metrics,
    analyzedAt: result.value.analyzedAt,
  };

  res.json(response);
});

// ─── GET /api/evaluation/full?country=spain ─────────────────
app.get("/api/evaluation/full", (req: Request, res: Response) => {
  const country = (req.query.country as string) || "spain";

  const policy: PolicyDecision = {
    id: "housing-law-2023",
    title: "Ley de Vivienda",
    description: "Regulación del mercado del alquiler",
    date: new Date("2023-05-25"),
    actors: ["gobierno", "parlamento"],
    objectives: ["reducir coste vivienda", "regular mercado alquiler"],
    domain: "housing",
  };

  const result = fullEvaluationUC.execute({
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

  res.json(result.value satisfies FullEvaluationResponse);
});

// ─── POST /api/evaluation/full ──────────────────────────────
app.post("/api/evaluation/full", validateFullEvaluation, (req: Request, res: Response) => {
  const body = req.body as FullEvaluationRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const result = fullEvaluationUC.execute({
    policy,
    country: body.country,
    stages: body.stages as PipelineStageName[],
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

  res.json(result.value satisfies FullEvaluationResponse);
});

// ─── POST /api/scenarios/run ─────────────────────────────────
app.post("/api/scenarios/run", validateScenarioRun, (req: Request, res: Response) => {
  const body = req.body as ScenarioRequest;

  const policy: PolicyDecision = {
    id: body.policy.id,
    title: body.policy.title,
    description: body.policy.description || "",
    date: new Date(),
    actors: body.policy.actors || [],
    objectives: body.policy.objectives || [],
    domain: body.policy.domain as PolicyDomain,
  };

  const scenarios = body.scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || "",
    assumptions: s.assumptions || {},
  }));

  const result = runScenariosUC.execute({
    policy,
    country: body.country,
    scenarios,
    correlationId: req.headers["x-correlation-id"] as string,
  });

  if (!result.ok) {
    const statusCode = result.error.code === "DATA_SOURCE_ERROR" ? 404 : 500;
    res.status(statusCode).json({
      error: "Scenario Analysis Error",
      code: result.error.code,
      message: result.error.message,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  const response: ScenarioResponse = {
    scenarios: result.value.scenarios.map((s) => ({
      scenario: {
        id: s.scenario.id,
        name: s.scenario.name,
        description: s.scenario.description,
        assumptions: s.scenario.assumptions,
      },
      pqi: s.pqi,
      modifiedIndicators: s.modifiedIndicators,
    })),
    ranking: result.value.ranking,
    bestCase: {
      scenario: {
        id: result.value.bestCase.scenario.id,
        name: result.value.bestCase.scenario.name,
        description: result.value.bestCase.scenario.description,
        assumptions: result.value.bestCase.scenario.assumptions,
      },
      pqi: result.value.bestCase.pqi,
      modifiedIndicators: result.value.bestCase.modifiedIndicators,
    },
    worstCase: {
      scenario: {
        id: result.value.worstCase.scenario.id,
        name: result.value.worstCase.scenario.name,
        description: result.value.worstCase.scenario.description,
        assumptions: result.value.worstCase.scenario.assumptions,
      },
      pqi: result.value.worstCase.pqi,
      modifiedIndicators: result.value.worstCase.modifiedIndicators,
    },
    sensitivityAnalysis: result.value.sensitivityAnalysis,
    durationMs: 0,
    evaluatedAt: new Date().toISOString(),
  };

  res.json(response);
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
        "GET  /api/actors?country=spain",
        "POST /api/actors/analyze",
        "POST /api/media/analyze",
        "GET  /api/evaluation/full?country=spain",
        "POST /api/evaluation/full",
        "POST /api/scenarios/run",
      ],
    });
  });
}

export { app, container };
