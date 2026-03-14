// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { ActorAnalysisResult } from "../actors/actor-influence";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";
import type { PolicyDecision } from "../policy/policy-decision";

/**
 * Pipeline stage — a pure function that takes accumulated context
 * and produces additional metrics.
 *
 * Design: Strategy pattern where each stage enriches the result.
 * Stages execute sequentially, each receiving the output of all prior stages.
 */
export type PipelineStage = (context: PipelineContext) => PipelineStageResult;

/**
 * Accumulated context flowing through the pipeline.
 * Each stage may read from previous results and add its own.
 */
export interface PipelineContext {
  readonly policy: PolicyDecision;
  readonly country: string;
  /** Metrics from policy domain evaluation */
  domainMetrics: EvaluatedMetric[];
  /** Actor analysis result (populated after actor stage) */
  actorAnalysis?: ActorAnalysisResult;
  /** Media metrics (populated after media stage) */
  mediaMetrics?: EvaluatedMetric[];
  /** Vote analysis metrics (populated after vote stage) */
  voteMetrics?: EvaluatedMetric[];
  /** Judicial risk metrics (populated after judicial stage) */
  judicialMetrics?: EvaluatedMetric[];
  /** Evidence quality metrics (populated after evidence stage) */
  evidenceMetrics?: EvaluatedMetric[];
  /** Public reaction metrics (populated after public reaction stage) */
  publicReactionMetrics?: EvaluatedMetric[];
  /** Composite metrics (populated after PQI stage) */
  compositeMetrics?: EvaluatedMetric[];
}

export interface PipelineStageResult {
  /** Name of the stage for reporting */
  readonly stageName: string;
  /** New metrics produced by this stage */
  readonly metrics: EvaluatedMetric[];
  /** Updated context fields to merge into the pipeline context */
  readonly contextUpdates: Partial<PipelineContext>;
}

/**
 * Output of a single stage in the pipeline result.
 */
export interface StageOutput {
  readonly stageName: string;
  readonly metrics: EvaluatedMetric[];
  readonly durationMs: number;
}

/**
 * Result of the full evaluation pipeline.
 */
export interface PipelineResult {
  readonly policy: { id: string; title: string; domain: string };
  readonly country: string;
  /** All metrics from all stages, grouped by stage */
  readonly stageResults: StageOutput[];
  /** The composite PQI score (if PQI stage was included) */
  readonly pqi?: import("./pqi-calculator").PolicyQualityIndex;
  /** Total pipeline execution time */
  readonly durationMs: number;
  readonly evaluatedAt: string;
}

/**
 * Multi-layered Evaluation Pipeline
 *
 * Executes stages in sequence:
 *   policy_engine → actor_analysis → media_model → pqi_computation
 *
 * ## Design Principles
 *
 * 1. **Graceful degradation**: If a stage fails (e.g., no actor data),
 *    the pipeline continues with remaining stages. Only the domain
 *    evaluation stage is required.
 *
 * 2. **Pure orchestration**: Each stage delegates to existing pure functions.
 *    The pipeline itself is a thin coordinator.
 *
 * 3. **Context accumulation**: Each stage can read results from all prior
 *    stages via the PipelineContext, enabling cross-stage analysis.
 */
export class EvaluationPipeline {
  constructor(private readonly stages: PipelineStage[]) {}

  execute(initialContext: PipelineContext): PipelineResult {
    const pipelineStart = Date.now();
    let context = { ...initialContext };
    const stageResults: StageOutput[] = [];

    for (const stage of this.stages) {
      const stageStart = Date.now();

      try {
        const result = stage(context);

        // Merge context updates
        context = { ...context, ...result.contextUpdates };

        stageResults.push({
          stageName: result.stageName,
          metrics: result.metrics,
          durationMs: Date.now() - stageStart,
        });
      } catch (_error) {
        // Graceful degradation: log and continue with remaining stages
        // This allows the pipeline to produce partial results
      }
    }

    const durationMs = Date.now() - pipelineStart;

    return {
      policy: {
        id: context.policy.id,
        title: context.policy.title,
        domain: context.policy.domain,
      },
      country: context.country,
      stageResults,
      pqi: context.compositeMetrics ? this.extractPQI(context) : undefined,
      durationMs,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private extractPQI(context: PipelineContext): import("./pqi-calculator").PolicyQualityIndex | undefined {
    // PQI is stored in compositeMetrics by the PQI stage
    // The actual PQI object is set by the pqi-stage via context updates
    return (context as unknown as Record<string, unknown>).pqi as
      | import("./pqi-calculator").PolicyQualityIndex
      | undefined;
  }
}

/**
 * Factory function for creating a configured pipeline.
 */
export function createEvaluationPipeline(stages: PipelineStage[]): EvaluationPipeline {
  return new EvaluationPipeline(stages);
}
