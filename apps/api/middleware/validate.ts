// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type {
  ActorAnalysisRequest,
  CompareCountriesRequest,
  ErrorResponse,
  EvaluatePolicyRequest,
  FullEvaluationRequest,
  MediaAnalysisRequest,
  ScenarioRequest,
} from "@hodiopolitica/contracts";
import { VALID_DOMAINS } from "@hodiopolitica/contracts";
import type { NextFunction, Request, Response } from "express";

/**
 * Validation middleware factory.
 *
 * Separates input validation from route handlers so routes
 * only contain business orchestration, never input checking.
 */

function validationError(res: Response, code: string, message: string): void {
  res.status(400).json({
    error: "Validation Error",
    code,
    message,
    timestamp: new Date().toISOString(),
  } satisfies ErrorResponse);
}

/**
 * Validates POST /api/policy/evaluate body.
 */
export function validateEvaluatePolicy(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<EvaluatePolicyRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  const { policy } = body;

  if (!policy.id || typeof policy.id !== "string") {
    validationError(res, "INVALID_FIELD", "policy.id is required and must be a string");
    return;
  }

  if (!policy.title || typeof policy.title !== "string") {
    validationError(res, "INVALID_FIELD", "policy.title is required and must be a string");
    return;
  }

  if (!policy.domain || !VALID_DOMAINS.includes(policy.domain as (typeof VALID_DOMAINS)[number])) {
    validationError(res, "INVALID_DOMAIN", `policy.domain must be one of: ${VALID_DOMAINS.join(", ")}`);
    return;
  }

  next();
}

/**
 * Validates POST /api/policy/compare body.
 */
export function validateCompareCountries(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<CompareCountriesRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  const { policy } = body;

  if (!policy.id || !policy.title || !policy.domain) {
    validationError(res, "INVALID_POLICY", 'policy must include "id", "title", and "domain"');
    return;
  }

  if (!VALID_DOMAINS.includes(policy.domain as (typeof VALID_DOMAINS)[number])) {
    validationError(res, "INVALID_DOMAIN", `policy.domain must be one of: ${VALID_DOMAINS.join(", ")}`);
    return;
  }

  if (!Array.isArray(body.countries) || body.countries.length < 2) {
    validationError(res, "INVALID_COUNTRIES", "countries must be an array with at least 2 entries");
    return;
  }

  if (body.countries.length > 10) {
    validationError(res, "TOO_MANY_COUNTRIES", "Maximum 10 countries per comparison");
    return;
  }

  next();
}

/**
 * Validates POST /api/actors/analyze body.
 */
export function validateActorAnalysis(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<ActorAnalysisRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  if (!body.policy.id || !body.policy.title || !body.policy.domain) {
    validationError(res, "INVALID_POLICY", 'policy must include "id", "title", and "domain"');
    return;
  }

  if (!body.country || typeof body.country !== "string") {
    validationError(res, "INVALID_COUNTRY", "country is required and must be a string");
    return;
  }

  next();
}

/**
 * Validates POST /api/media/analyze body.
 */
export function validateMediaAnalysis(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<MediaAnalysisRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  if (!body.policy.id || !body.policy.title || !body.policy.domain) {
    validationError(res, "INVALID_POLICY", 'policy must include "id", "title", and "domain"');
    return;
  }

  if (!body.country || typeof body.country !== "string") {
    validationError(res, "INVALID_COUNTRY", "country is required and must be a string");
    return;
  }

  next();
}

const VALID_STAGES = ["domain", "actors", "media", "pqi"] as const;

/**
 * Validates POST /api/evaluation/full body.
 */
export function validateFullEvaluation(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<FullEvaluationRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  if (!body.policy.id || !body.policy.title || !body.policy.domain) {
    validationError(res, "INVALID_POLICY", 'policy must include "id", "title", and "domain"');
    return;
  }

  if (!VALID_DOMAINS.includes(body.policy.domain as (typeof VALID_DOMAINS)[number])) {
    validationError(res, "INVALID_DOMAIN", `policy.domain must be one of: ${VALID_DOMAINS.join(", ")}`);
    return;
  }

  if (!body.country || typeof body.country !== "string") {
    validationError(res, "INVALID_COUNTRY", "country is required and must be a string");
    return;
  }

  if (body.stages) {
    if (!Array.isArray(body.stages)) {
      validationError(res, "INVALID_STAGES", "stages must be an array");
      return;
    }
    for (const s of body.stages) {
      if (!VALID_STAGES.includes(s as (typeof VALID_STAGES)[number])) {
        validationError(res, "INVALID_STAGES", `Invalid stage "${s}". Valid stages: ${VALID_STAGES.join(", ")}`);
        return;
      }
    }
  }

  next();
}

/**
 * Validates POST /api/scenarios/run body.
 */
export function validateScenarioRun(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<ScenarioRequest>;

  if (!body.policy) {
    validationError(res, "MISSING_POLICY", 'Request body must include a "policy" object');
    return;
  }

  if (!body.policy.id || !body.policy.title || !body.policy.domain) {
    validationError(res, "INVALID_POLICY", 'policy must include "id", "title", and "domain"');
    return;
  }

  if (!VALID_DOMAINS.includes(body.policy.domain as (typeof VALID_DOMAINS)[number])) {
    validationError(res, "INVALID_DOMAIN", `policy.domain must be one of: ${VALID_DOMAINS.join(", ")}`);
    return;
  }

  if (!body.country || typeof body.country !== "string") {
    validationError(res, "INVALID_COUNTRY", "country is required and must be a string");
    return;
  }

  if (!Array.isArray(body.scenarios) || body.scenarios.length === 0) {
    validationError(res, "INVALID_SCENARIOS", "scenarios must be a non-empty array");
    return;
  }

  if (body.scenarios.length > 10) {
    validationError(res, "INVALID_SCENARIOS", "Maximum 10 scenarios per run");
    return;
  }

  for (let i = 0; i < body.scenarios.length; i++) {
    const s = body.scenarios[i];
    if (!s.id || !s.name) {
      validationError(res, "INVALID_SCENARIOS", `scenarios[${i}] must include "id" and "name"`);
      return;
    }
  }

  next();
}
