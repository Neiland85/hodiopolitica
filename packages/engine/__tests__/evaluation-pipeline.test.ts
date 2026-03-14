// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it, vi } from "vitest";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";
import type { PipelineContext, PipelineStage, PipelineStageResult } from "../pipeline/evaluation-pipeline";
import { createEvaluationPipeline, EvaluationPipeline } from "../pipeline/evaluation-pipeline";

// ─── Test Helpers ────────────────────────────────────────────

const testPolicy = {
  id: "test-policy",
  title: "Test Policy",
  description: "A test policy",
  date: new Date(),
  actors: ["test"],
  objectives: ["test"],
  domain: "housing" as const,
};

function createTestContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    policy: testPolicy,
    country: "spain",
    domainMetrics: [],
    ...overrides,
  };
}

function createSuccessStage(name: string, metrics: EvaluatedMetric[] = []): PipelineStage {
  return (_context: PipelineContext): PipelineStageResult => ({
    stageName: name,
    metrics,
    contextUpdates: {},
  });
}

function createMetric(metricName: string, value: number): EvaluatedMetric {
  return {
    policyId: "test-policy",
    metricName,
    value,
    source: "test",
    description: `Test: ${metricName}`,
    severity: "low",
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("EvaluationPipeline", () => {
  describe("basic execution", () => {
    it("should execute an empty pipeline", () => {
      const pipeline = new EvaluationPipeline([]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(0);
      expect(result.policy.id).toBe("test-policy");
      expect(result.country).toBe("spain");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.evaluatedAt).toBeTruthy();
    });

    it("should execute a single stage", () => {
      const stage = createSuccessStage("test_stage", [createMetric("test_metric", 42)]);
      const pipeline = new EvaluationPipeline([stage]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(1);
      expect(result.stageResults[0].stageName).toBe("test_stage");
      expect(result.stageResults[0].metrics).toHaveLength(1);
      expect(result.stageResults[0].metrics[0].value).toBe(42);
    });

    it("should execute multiple stages in sequence", () => {
      const stages = [
        createSuccessStage("stage_1", [createMetric("metric_1", 10)]),
        createSuccessStage("stage_2", [createMetric("metric_2", 20)]),
        createSuccessStage("stage_3", [createMetric("metric_3", 30)]),
      ];

      const pipeline = new EvaluationPipeline(stages);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(3);
      expect(result.stageResults.map((s) => s.stageName)).toEqual(["stage_1", "stage_2", "stage_3"]);
    });

    it("should track duration per stage", () => {
      const stage = createSuccessStage("timed_stage");
      const pipeline = new EvaluationPipeline([stage]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("context accumulation", () => {
    it("should pass accumulated context between stages", () => {
      const receivedContexts: PipelineContext[] = [];

      const stage1: PipelineStage = (ctx) => {
        receivedContexts.push({ ...ctx });
        return {
          stageName: "stage_1",
          metrics: [],
          contextUpdates: { domainMetrics: [createMetric("domain_metric", 50)] },
        };
      };

      const stage2: PipelineStage = (ctx) => {
        receivedContexts.push({ ...ctx });
        return {
          stageName: "stage_2",
          metrics: [],
          contextUpdates: {},
        };
      };

      const pipeline = new EvaluationPipeline([stage1, stage2]);
      pipeline.execute(createTestContext());

      // Stage 1 receives original context (empty domainMetrics)
      expect(receivedContexts[0].domainMetrics).toHaveLength(0);
      // Stage 2 receives updated context with domainMetrics from stage 1
      expect(receivedContexts[1].domainMetrics).toHaveLength(1);
      expect(receivedContexts[1].domainMetrics[0].metricName).toBe("domain_metric");
    });

    it("should merge context updates from multiple stages", () => {
      const stage1: PipelineStage = (_ctx) => ({
        stageName: "domain",
        metrics: [createMetric("housing_pressure", 50)],
        contextUpdates: { domainMetrics: [createMetric("housing_pressure", 50)] },
      });

      const stage2: PipelineStage = (_ctx) => ({
        stageName: "actors",
        metrics: [],
        contextUpdates: {
          actorAnalysis: {
            influences: [],
            alignmentScore: 40,
            supportBalance: { supporting: 1, opposing: 0, neutral: 0, total: 1 },
            dominantChannel: "voting",
            analyzedAt: new Date(),
          },
        },
      });

      const pipeline = new EvaluationPipeline([stage1, stage2]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(2);
    });
  });

  describe("graceful degradation", () => {
    it("should continue when a stage throws an error", () => {
      const failingStage: PipelineStage = () => {
        throw new Error("Data source unavailable");
      };

      const stages = [
        createSuccessStage("stage_1", [createMetric("metric_1", 10)]),
        failingStage,
        createSuccessStage("stage_3", [createMetric("metric_3", 30)]),
      ];

      const pipeline = new EvaluationPipeline(stages);
      const result = pipeline.execute(createTestContext());

      // Only stages 1 and 3 succeed; stage 2 is silently skipped
      expect(result.stageResults).toHaveLength(2);
      expect(result.stageResults[0].stageName).toBe("stage_1");
      expect(result.stageResults[1].stageName).toBe("stage_3");
    });

    it("should still produce results when all optional stages fail", () => {
      const failingStage: PipelineStage = () => {
        throw new Error("No data");
      };

      const pipeline = new EvaluationPipeline([failingStage, failingStage]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(0);
      expect(result.pqi).toBeUndefined();
    });

    it("should preserve context from successful stages after failure", () => {
      const receivedContext: PipelineContext[] = [];

      const stage1: PipelineStage = (_ctx) => ({
        stageName: "domain",
        metrics: [createMetric("housing_pressure", 50)],
        contextUpdates: { domainMetrics: [createMetric("housing_pressure", 50)] },
      });

      const failingStage: PipelineStage = () => {
        throw new Error("Actor data unavailable");
      };

      const stage3: PipelineStage = (ctx) => {
        receivedContext.push({ ...ctx });
        return {
          stageName: "pqi",
          metrics: [],
          contextUpdates: {},
        };
      };

      const pipeline = new EvaluationPipeline([stage1, failingStage, stage3]);
      pipeline.execute(createTestContext());

      // Stage 3 should still see stage 1's context updates
      expect(receivedContext[0].domainMetrics).toHaveLength(1);
      // But no actor analysis (stage 2 failed)
      expect(receivedContext[0].actorAnalysis).toBeUndefined();
    });
  });

  describe("PQI extraction", () => {
    it("should extract PQI when PQI stage sets pqi in context", () => {
      const pqiStage: PipelineStage = (_ctx) => ({
        stageName: "pqi_computation",
        metrics: [createMetric("policy_quality_index", 75)],
        contextUpdates: {
          compositeMetrics: [createMetric("policy_quality_index", 75)],
          pqi: {
            score: 75,
            grade: "B",
            components: [],
            summary: "PQI 75/100 (Grade B — Good).",
          },
        } as unknown as Partial<PipelineContext>,
      });

      const pipeline = new EvaluationPipeline([pqiStage]);
      const result = pipeline.execute(createTestContext());

      expect(result.pqi).toBeDefined();
      expect(result.pqi?.score).toBe(75);
      expect(result.pqi?.grade).toBe("B");
    });

    it("should return undefined PQI when no PQI stage", () => {
      const pipeline = new EvaluationPipeline([createSuccessStage("domain")]);
      const result = pipeline.execute(createTestContext());

      expect(result.pqi).toBeUndefined();
    });
  });

  describe("factory function", () => {
    it("should create pipeline via createEvaluationPipeline", () => {
      const pipeline = createEvaluationPipeline([createSuccessStage("test")]);
      const result = pipeline.execute(createTestContext());

      expect(result.stageResults).toHaveLength(1);
    });
  });

  describe("result structure", () => {
    it("should include policy metadata in result", () => {
      const pipeline = new EvaluationPipeline([]);
      const result = pipeline.execute(createTestContext());

      expect(result.policy).toEqual({
        id: "test-policy",
        title: "Test Policy",
        domain: "housing",
      });
    });

    it("should include ISO timestamp in evaluatedAt", () => {
      const pipeline = new EvaluationPipeline([]);
      const result = pipeline.execute(createTestContext());

      // Validate ISO 8601 format
      expect(new Date(result.evaluatedAt).toISOString()).toBe(result.evaluatedAt);
    });
  });
});
