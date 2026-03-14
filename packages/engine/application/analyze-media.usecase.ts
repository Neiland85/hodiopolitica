// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { evaluateMediaInfluence } from "../media/media-influence-model";
import type { MetricThresholds, PolicyMetric } from "../metrics/policy-metric";
import { classifyMetricSeverity } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { MediaCoverageRepository } from "../repositories/media-coverage-repository";
import type { DomainError } from "../shared/errors/domain-error";
import { createEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import type { MediaAnalysisCompletedPayload, MediaAnalysisFailedPayload } from "../shared/events/media-events";
import { MediaEventTypes } from "../shared/events/media-events";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { ok } from "../shared/result/result";
import type { EvaluatedMetric } from "./evaluate-policy.usecase";

const logger = createLogger("usecase.analyze-media");

/**
 * Command DTO for media analysis.
 */
export interface AnalyzeMediaCommand {
  policy: PolicyDecision;
  country: string;
  correlationId?: string;
}

/**
 * Result of a successful media analysis.
 */
export interface MediaAnalysisResult {
  policy: { id: string; title: string; domain: string };
  coverage: {
    country: string;
    period: { start: string; end: string };
    sources: string[];
  };
  metrics: EvaluatedMetric[];
  analyzedAt: string;
}

/** Thresholds for media metrics severity classification. */
const MEDIA_METRIC_THRESHOLDS: Record<string, MetricThresholds> = {
  media_influence_score: { moderate: 30, high: 60, critical: 90 },
  narrative_distortion_index: { moderate: 25, high: 50, critical: 75 },
  polarization_amplification: { moderate: 20, high: 50, critical: 80 },
};

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 };

/**
 * Use Case: Analyze Media Influence on a Policy
 *
 * Orchestrates the media analysis workflow:
 *   1. Load media coverage via repository
 *   2. Run evaluateMediaInfluence() pure function
 *   3. Classify metric severity
 *   4. Publish domain event
 *   5. Return typed Result
 */
export class AnalyzeMediaUseCase {
  constructor(private readonly mediaRepo: MediaCoverageRepository) {}

  execute(command: AnalyzeMediaCommand): Result<MediaAnalysisResult, DomainError> {
    const start = Date.now();

    logger.info("Analyzing media influence", {
      policyId: command.policy.id,
      country: command.country,
    });

    // 1. Load coverage
    const coverageResult = this.mediaRepo.findByPolicy(command.policy.id, command.country);

    if (!coverageResult.ok) {
      this.publishFailureEvent(command, coverageResult.error);
      return coverageResult;
    }

    const coverage = coverageResult.value;

    // 2. Evaluate media influence
    const rawMetrics: PolicyMetric[] = evaluateMediaInfluence(command.policy, coverage);

    // 3. Classify severity
    const metrics: EvaluatedMetric[] = rawMetrics.map((m) => ({
      policyId: m.policyId,
      metricName: m.metricName,
      value: m.value,
      source: m.source,
      description: m.description,
      severity: classifyMetricSeverity(m.value, MEDIA_METRIC_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS),
    }));

    const durationMs = Date.now() - start;

    // 4. Build result
    const result: MediaAnalysisResult = {
      policy: {
        id: command.policy.id,
        title: command.policy.title,
        domain: command.policy.domain,
      },
      coverage: {
        country: coverage.country,
        period: {
          start: coverage.period.startDate,
          end: coverage.period.endDate,
        },
        sources: coverage.sources,
      },
      metrics,
      analyzedAt: new Date().toISOString(),
    };

    // 5. Publish success event
    this.publishSuccessEvent(command, metrics, durationMs);

    logger.info("Media analysis completed", {
      policyId: command.policy.id,
      metricsCount: metrics.length,
      durationMs,
    });

    return ok(result);
  }

  private publishSuccessEvent(command: AnalyzeMediaCommand, metrics: EvaluatedMetric[], durationMs: number): void {
    const findMetric = (name: string) => metrics.find((m) => m.metricName === name)?.value ?? 0;

    const payload: MediaAnalysisCompletedPayload = {
      policyId: command.policy.id,
      country: command.country,
      mediaInfluenceScore: findMetric("media_influence_score"),
      narrativeDistortionIndex: findMetric("narrative_distortion_index"),
      polarizationAmplification: findMetric("polarization_amplification"),
      durationMs,
    };

    eventBus.publish(
      createEvent(MediaEventTypes.MediaAnalysisCompleted, "analyze-media-usecase", payload, command.correlationId),
    );
  }

  private publishFailureEvent(command: AnalyzeMediaCommand, error: DomainError): void {
    const payload: MediaAnalysisFailedPayload = {
      policyId: command.policy.id,
      country: command.country,
      errorCode: error.code,
      errorMessage: error.message,
    };

    eventBus.publish(
      createEvent(MediaEventTypes.MediaAnalysisFailed, "analyze-media-usecase", payload, command.correlationId),
    );
  }
}
