// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";
import type { PipelineContext } from "../pipeline/evaluation-pipeline";
import { createActorAnalysisStage } from "../pipeline/stages/actor-analysis-stage";
import { createDomainEvaluationStage } from "../pipeline/stages/domain-evaluation-stage";
import { createMediaAnalysisStage } from "../pipeline/stages/media-analysis-stage";
import { createPQIStage } from "../pipeline/stages/pqi-stage";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileActorRepository } from "../repositories/file-actor-repository";
import { FileEconomicContextRepository } from "../repositories/file-economic-context-repository";
import { FileMediaCoverageRepository } from "../repositories/file-media-coverage-repository";

// ─── Test Fixtures ───────────────────────────────────────────

const dataDir = path.resolve(__dirname, "../../../data/sources");

const testPolicy: PolicyDecision = {
  id: "housing-law-2023",
  title: "Ley de Vivienda 2023",
  description: "Spanish housing regulation",
  date: new Date(),
  actors: ["gov"],
  objectives: ["affordable-housing"],
  domain: "housing",
};

function createBaseContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    policy: testPolicy,
    country: "spain",
    domainMetrics: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("Pipeline Stages", () => {
  describe("createDomainEvaluationStage", () => {
    it("should evaluate policy against economic context", () => {
      const repo = new FileEconomicContextRepository(dataDir);
      const stage = createDomainEvaluationStage(repo);

      const result = stage(createBaseContext());

      expect(result.stageName).toBe("domain_evaluation");
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.contextUpdates.domainMetrics).toBeDefined();
      expect(result.contextUpdates.domainMetrics?.length).toBeGreaterThan(0);
    });

    it("should classify metric severity", () => {
      const repo = new FileEconomicContextRepository(dataDir);
      const stage = createDomainEvaluationStage(repo);

      const result = stage(createBaseContext());

      for (const metric of result.metrics) {
        expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
      }
    });

    it("should throw for unknown country", () => {
      const repo = new FileEconomicContextRepository(dataDir);
      const stage = createDomainEvaluationStage(repo);

      expect(() => stage(createBaseContext({ country: "atlantis" }))).toThrow("Domain evaluation failed");
    });
  });

  describe("createActorAnalysisStage", () => {
    it("should analyze actors for a given country", () => {
      const repo = new FileActorRepository();
      const stage = createActorAnalysisStage(repo);

      const result = stage(createBaseContext());

      expect(result.stageName).toBe("actor_analysis");
      expect(result.metrics).toHaveLength(0); // Actor stage doesn't produce EvaluatedMetrics
      expect(result.contextUpdates.actorAnalysis).toBeDefined();
      expect(result.contextUpdates.actorAnalysis?.influences.length).toBeGreaterThan(0);
      expect(result.contextUpdates.actorAnalysis?.alignmentScore).toBeDefined();
    });

    it("should throw for unknown country", () => {
      const repo = new FileActorRepository();
      const stage = createActorAnalysisStage(repo);

      expect(() => stage(createBaseContext({ country: "atlantis" }))).toThrow("Actor analysis failed");
    });
  });

  describe("createMediaAnalysisStage", () => {
    it("should analyze media coverage for a policy", () => {
      const repo = new FileMediaCoverageRepository();
      const stage = createMediaAnalysisStage(repo);

      const result = stage(createBaseContext());

      expect(result.stageName).toBe("media_analysis");
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.contextUpdates.mediaMetrics).toBeDefined();

      // Should produce 3 media metrics
      const metricNames = result.metrics.map((m) => m.metricName);
      expect(metricNames).toContain("media_influence_score");
      expect(metricNames).toContain("narrative_distortion_index");
      expect(metricNames).toContain("polarization_amplification");
    });

    it("should classify media metrics with appropriate severity", () => {
      const repo = new FileMediaCoverageRepository();
      const stage = createMediaAnalysisStage(repo);

      const result = stage(createBaseContext());

      for (const metric of result.metrics) {
        expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
      }
    });

    it("should throw for unknown policy/country combination", () => {
      const repo = new FileMediaCoverageRepository();
      const stage = createMediaAnalysisStage(repo);

      expect(() =>
        stage(
          createBaseContext({
            policy: { ...testPolicy, id: "nonexistent-policy" },
            country: "atlantis",
          }),
        ),
      ).toThrow("Media analysis failed");
    });
  });

  describe("createPQIStage", () => {
    it("should compute PQI from domain metrics only", () => {
      const domainMetrics: EvaluatedMetric[] = [
        {
          policyId: "test",
          metricName: "housing_pressure",
          value: 45,
          source: "test",
          description: "Test",
          severity: "moderate",
        },
      ];

      const stage = createPQIStage();
      const result = stage(createBaseContext({ domainMetrics }));

      expect(result.stageName).toBe("pqi_computation");
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].metricName).toBe("policy_quality_index");
      expect(result.contextUpdates.compositeMetrics).toBeDefined();

      // PQI should be set in context
      const updates = result.contextUpdates as Record<string, unknown>;
      expect(updates.pqi).toBeDefined();
    });

    it("should include PQI grade in composite metric severity", () => {
      const domainMetrics: EvaluatedMetric[] = [
        {
          policyId: "test",
          metricName: "housing_pressure",
          value: 10,
          source: "test",
          description: "Low stress",
          severity: "low",
        },
      ];

      const stage = createPQIStage();
      const result = stage(createBaseContext({ domainMetrics }));

      // Low stress → high PQI → low severity
      expect(result.metrics[0].severity).toBe("low");
    });

    it("should compute PQI with all available context", () => {
      const domainMetrics: EvaluatedMetric[] = [
        {
          policyId: "test",
          metricName: "housing_pressure",
          value: 40,
          source: "test",
          description: "Test",
          severity: "moderate",
        },
      ];

      const actorAnalysis = {
        influences: [
          {
            actorId: "a1",
            actorType: "public" as const,
            influenceScore: 60,
            influenceChannel: "electoral_behavior" as const,
            stance: "support" as const,
            description: "Public support",
          },
        ],
        alignmentScore: 50,
        supportBalance: { supporting: 1, opposing: 0, neutral: 0, total: 1 },
        dominantChannel: "electoral_behavior" as const,
        analyzedAt: new Date(),
      };

      const mediaMetrics: EvaluatedMetric[] = [
        {
          policyId: "test",
          metricName: "narrative_distortion_index",
          value: 25,
          source: "test",
          description: "Low distortion",
          severity: "moderate",
        },
      ];

      const stage = createPQIStage();
      const result = stage(createBaseContext({ domainMetrics, actorAnalysis, mediaMetrics }));

      const updates = result.contextUpdates as Record<string, unknown>;
      const pqi = updates.pqi as { score: number; grade: string; components: unknown[] };
      expect(pqi.components).toHaveLength(4); // domain, actors, public, media
      expect(pqi.score).toBeGreaterThan(0);
    });
  });
});
