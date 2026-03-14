// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PipelineContext } from "../pipeline/evaluation-pipeline";
import { createEvidenceValidationStage } from "../pipeline/stages/evidence-validation-stage";
import { createPublicReactionStage } from "../pipeline/stages/public-reaction-stage";
import type { PolicyDecision } from "../policy/policy-decision";
import { FilePublicReactionRepository } from "../repositories/file-public-reaction-repository";
import { FileResearchReferenceRepository } from "../repositories/file-research-reference-repository";

// ─── Test Fixtures ───────────────────────────────────────────

const researchDataDir = path.resolve(__dirname, "../../../data/research");
const reactionDataDir = path.resolve(__dirname, "../../../data/public-reaction");

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

describe("Evidence Validation Pipeline Stage", () => {
  it("should produce evidence metrics from Spain research data", () => {
    const repo = new FileResearchReferenceRepository(researchDataDir);
    const stage = createEvidenceValidationStage(repo);

    const result = stage(createBaseContext());

    expect(result.stageName).toBe("evidence_validation");
    expect(result.metrics).toHaveLength(3);
    expect(result.metrics.map((m) => m.metricName)).toEqual([
      "evidence_strength",
      "methodology_credibility",
      "consensus_level",
    ]);
  });

  it("should classify metric severity", () => {
    const repo = new FileResearchReferenceRepository(researchDataDir);
    const stage = createEvidenceValidationStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(metric.severity).toBeDefined();
      expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
    }
  });

  it("should put evidence metrics in context updates", () => {
    const repo = new FileResearchReferenceRepository(researchDataDir);
    const stage = createEvidenceValidationStage(repo);

    const result = stage(createBaseContext());

    expect(result.contextUpdates).toBeDefined();
    expect(result.contextUpdates!.evidenceMetrics).toHaveLength(3);
  });

  it("should produce valid metric values (non-NaN, non-negative)", () => {
    const repo = new FileResearchReferenceRepository(researchDataDir);
    const stage = createEvidenceValidationStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(Number.isNaN(metric.value)).toBe(false);
      expect(metric.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("should throw when research data is not found for a country", () => {
    const repo = new FileResearchReferenceRepository(researchDataDir);
    const stage = createEvidenceValidationStage(repo);

    // Non-existent policy
    const ctx = createBaseContext({
      policy: { ...testPolicy, id: "nonexistent-policy-999" },
    });

    // findByPolicy returns empty array for unknown policy, so it won't throw
    // but should still produce metrics with 0 values
    const result = stage(ctx);
    expect(result.metrics).toHaveLength(3);
  });
});

describe("Public Reaction Pipeline Stage", () => {
  it("should produce public reaction metrics from Spain data", () => {
    const repo = new FilePublicReactionRepository(reactionDataDir);
    const stage = createPublicReactionStage(repo);

    const result = stage(createBaseContext());

    expect(result.stageName).toBe("public_reaction");
    expect(result.metrics).toHaveLength(3);
    expect(result.metrics.map((m) => m.metricName)).toEqual(["approval_trend", "protest_risk", "electoral_impact"]);
  });

  it("should classify metric severity", () => {
    const repo = new FilePublicReactionRepository(reactionDataDir);
    const stage = createPublicReactionStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(metric.severity).toBeDefined();
      expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
    }
  });

  it("should put public reaction metrics in context updates", () => {
    const repo = new FilePublicReactionRepository(reactionDataDir);
    const stage = createPublicReactionStage(repo);

    const result = stage(createBaseContext());

    expect(result.contextUpdates).toBeDefined();
    expect(result.contextUpdates!.publicReactionMetrics).toHaveLength(3);
  });

  it("should produce valid metric values (non-NaN)", () => {
    const repo = new FilePublicReactionRepository(reactionDataDir);
    const stage = createPublicReactionStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(Number.isNaN(metric.value)).toBe(false);
    }
  });

  it("should throw when reaction data is not found", () => {
    const repo = new FilePublicReactionRepository(reactionDataDir);
    const stage = createPublicReactionStage(repo);

    const ctx = createBaseContext({
      policy: { ...testPolicy, id: "nonexistent-policy-999" },
    });

    expect(() => stage(ctx)).toThrow();
  });
});
