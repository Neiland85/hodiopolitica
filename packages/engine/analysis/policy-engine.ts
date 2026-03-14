// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyContext } from "../context/policy-context";
import type { PolicyMetric } from "../metrics/policy-metric";
import { evaluateEconomyPolicy } from "../models/economy-policy-model";
import { evaluateEducationPolicy } from "../models/education-policy-model";
import { evaluateEnvironmentPolicy } from "../models/environment-policy-model";
import { evaluateHealthcarePolicy } from "../models/healthcare-policy-model";
import { evaluateHousingPolicy } from "../models/housing-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Central policy evaluation engine.
 *
 * Routes a PolicyDecision to the appropriate domain-specific model
 * based on the `domain` field, and returns computed metrics.
 *
 * Design: Strategy pattern — each domain has its own evaluator function.
 * Adding a new domain requires:
 *   1. Creating a new model in `../models/`
 *   2. Registering it in the `evaluators` map below
 */

export type PolicyEvaluator = (decision: PolicyDecision, context: PolicyContext) => PolicyMetric[];

const evaluators: Record<string, PolicyEvaluator> = {
  housing: evaluateHousingPolicy,
  education: evaluateEducationPolicy,
  healthcare: evaluateHealthcarePolicy,
  economy: evaluateEconomyPolicy,
  environment: evaluateEnvironmentPolicy,
};

export function evaluatePolicy(decision: PolicyDecision, context: PolicyContext): PolicyMetric[] {
  const evaluator = evaluators[decision.domain];

  if (evaluator) {
    return evaluator(decision, context);
  }

  // Fallback: return a placeholder metric for unsupported domains
  return [
    {
      policyId: decision.id,
      metricName: "generic_policy_analysis",
      value: 0,
      source: "policy-engine",
      timestamp: new Date(),
      description: `No specialized model available for domain "${decision.domain}". Register an evaluator in policy-engine.ts.`,
    },
  ];
}
