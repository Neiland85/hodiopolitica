// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { evaluatePolicy } from "../analysis/policy-engine";
import type { MetricThresholds, PolicyMetric } from "../metrics/policy-metric";
import { classifyMetricSeverity } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { EconomicContextRepository } from "../repositories/economic-context-repository";
import type { DomainError } from "../shared/errors/domain-error";
import { createEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import type { PolicyEvaluatedPayload, PolicyEvaluationFailedPayload } from "../shared/events/policy-events";
import { PolicyEventTypes } from "../shared/events/policy-events";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { ok } from "../shared/result/result";

const logger = createLogger("usecase.evaluate-policy");

/**
 * Command DTO for policy evaluation.
 */
export interface EvaluatePolicyCommand {
  policy: PolicyDecision;
  country: string;
  correlationId?: string;
}

/**
 * Result of a successful evaluation.
 */
export interface EvaluationResult {
  policy: { id: string; title: string; domain: string };
  context: { country: string; year: number; sources: string[] };
  metrics: EvaluatedMetric[];
  durationMs: number;
  evaluatedAt: string;
}

export interface EvaluatedMetric {
  policyId: string;
  metricName: string;
  value: number;
  source: string;
  description: string;
  severity: "low" | "moderate" | "high" | "critical";
}

/** Thresholds per metric for severity classification. */
const METRIC_THRESHOLDS: Record<string, MetricThresholds> = {
  housing_pressure: { moderate: 30, high: 60, critical: 90 },
  social_stress: { moderate: 20, high: 40, critical: 60 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Use Case: Evaluate a Policy
 *
 * Orchestrates the full evaluation workflow:
 *   1. Load economic context via repository
 *   2. Run the domain evaluation engine
 *   3. Classify metric severity
 *   4. Publish domain event (success or failure)
 *   5. Return typed Result
 *
 * This is the ONLY entry point for policy evaluation from the API.
 * It separates the application orchestration from pure domain logic.
 */
export class EvaluatePolicyUseCase {
  constructor(private readonly contextRepo: EconomicContextRepository) {}

  execute(command: EvaluatePolicyCommand): Result<EvaluationResult, DomainError> {
    const start = Date.now();

    logger.info("Evaluating policy", {
      policyId: command.policy.id,
      domain: command.policy.domain,
      country: command.country,
    });

    // 1. Load context
    const contextResult = this.contextRepo.findByCountry(command.country);

    if (!contextResult.ok) {
      this.publishFailureEvent(command, contextResult.error);
      return contextResult;
    }

    const context = contextResult.value;

    // 2. Evaluate
    const rawMetrics: PolicyMetric[] = evaluatePolicy(command.policy, context);

    // 3. Classify severity
    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, METRIC_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    const durationMs = Date.now() - start;

    // 4. Build result
    const result: EvaluationResult = {
      policy: {
        id: command.policy.id,
        title: command.policy.title,
        domain: command.policy.domain,
      },
      context: {
        country: context.country,
        year: context.year,
        sources: context.sources,
      },
      metrics,
      durationMs,
      evaluatedAt: new Date().toISOString(),
    };

    // 5. Publish success event
    this.publishSuccessEvent(command, result);

    logger.info("Policy evaluated successfully", {
      policyId: command.policy.id,
      metricsCount: metrics.length,
      durationMs,
    });

    return ok(result);
  }

  private publishSuccessEvent(command: EvaluatePolicyCommand, result: EvaluationResult): void {
    const payload: PolicyEvaluatedPayload = {
      policyId: command.policy.id,
      domain: command.policy.domain,
      country: result.context.country,
      year: result.context.year,
      metricsCount: result.metrics.length,
      metrics: result.metrics.map((m) => ({
        name: m.metricName,
        value: m.value,
        severity: m.severity,
      })),
      durationMs: result.durationMs,
    };

    eventBus.publish(
      createEvent(PolicyEventTypes.PolicyEvaluated, "evaluate-policy-usecase", payload, command.correlationId),
    );
  }

  private publishFailureEvent(command: EvaluatePolicyCommand, error: DomainError): void {
    const payload: PolicyEvaluationFailedPayload = {
      policyId: command.policy.id,
      domain: command.policy.domain,
      errorCode: error.code,
      errorMessage: error.message,
    };

    eventBus.publish(
      createEvent(PolicyEventTypes.PolicyEvaluationFailed, "evaluate-policy-usecase", payload, command.correlationId),
    );
  }
}
