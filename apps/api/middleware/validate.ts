// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { NextFunction, Request, Response } from "express";
import type {
  CompareCountriesRequest,
  ErrorResponse,
  EvaluatePolicyRequest,
} from "../../../packages/contracts/src/index";
import { VALID_DOMAINS } from "../../../packages/contracts/src/index";

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
