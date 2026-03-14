// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PipelineContext } from "../pipeline/evaluation-pipeline";
import { createJudicialRiskStage } from "../pipeline/stages/judicial-risk-stage";
import { createVoteAnalysisStage } from "../pipeline/stages/vote-analysis-stage";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileJudicialActionRepository } from "../repositories/file-judicial-action-repository";
import { FileVoteRepository } from "../repositories/file-vote-repository";

// ─── Test Fixtures ───────────────────────────────────────────

const votesDataDir = path.resolve(__dirname, "../../../data/votes");
const judicialDataDir = path.resolve(__dirname, "../../../data/judicial");

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

describe("Vote Analysis Pipeline Stage", () => {
  it("should produce vote metrics from Spain data", () => {
    const repo = new FileVoteRepository(votesDataDir);
    const stage = createVoteAnalysisStage(repo);

    const result = stage(createBaseContext());

    expect(result.stageName).toBe("vote_analysis");
    expect(result.metrics).toHaveLength(3);
    expect(result.metrics.map((m) => m.metricName)).toEqual([
      "passage_probability",
      "amendment_risk",
      "coalition_stability",
    ]);
  });

  it("should classify metric severity", () => {
    const repo = new FileVoteRepository(votesDataDir);
    const stage = createVoteAnalysisStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
    }
  });

  it("should update context with voteMetrics", () => {
    const repo = new FileVoteRepository(votesDataDir);
    const stage = createVoteAnalysisStage(repo);

    const result = stage(createBaseContext());

    expect(result.contextUpdates.voteMetrics).toBeDefined();
    expect(result.contextUpdates.voteMetrics).toHaveLength(3);
  });

  it("should throw for missing data file", () => {
    const repo = new FileVoteRepository("/nonexistent/path");
    const stage = createVoteAnalysisStage(repo);

    expect(() => stage(createBaseContext())).toThrow("Vote analysis failed");
  });

  it("should return neutral metrics for unknown policy ID", () => {
    const repo = new FileVoteRepository(votesDataDir);
    const stage = createVoteAnalysisStage(repo);

    const unknownPolicy: PolicyDecision = {
      ...testPolicy,
      id: "nonexistent-policy-9999",
    };

    const result = stage(createBaseContext({ policy: unknownPolicy }));

    // findByPolicy returns empty array for unknown policy → neutral defaults
    expect(result.metrics).toHaveLength(3);
    const pp = result.metrics.find((m) => m.metricName === "passage_probability");
    expect(pp?.value).toBe(50); // neutral default
  });
});

describe("Judicial Risk Pipeline Stage", () => {
  it("should produce judicial risk metrics from Spain data", () => {
    const repo = new FileJudicialActionRepository(judicialDataDir);
    const stage = createJudicialRiskStage(repo);

    const result = stage(createBaseContext());

    expect(result.stageName).toBe("judicial_risk");
    expect(result.metrics).toHaveLength(3);
    expect(result.metrics.map((m) => m.metricName)).toEqual([
      "legal_challenge_risk",
      "constitutional_compatibility",
      "enforcement_uncertainty",
    ]);
  });

  it("should classify metric severity", () => {
    const repo = new FileJudicialActionRepository(judicialDataDir);
    const stage = createJudicialRiskStage(repo);

    const result = stage(createBaseContext());

    for (const metric of result.metrics) {
      expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
    }
  });

  it("should update context with judicialMetrics", () => {
    const repo = new FileJudicialActionRepository(judicialDataDir);
    const stage = createJudicialRiskStage(repo);

    const result = stage(createBaseContext());

    expect(result.contextUpdates.judicialMetrics).toBeDefined();
    expect(result.contextUpdates.judicialMetrics).toHaveLength(3);
  });

  it("should throw for missing data file", () => {
    const repo = new FileJudicialActionRepository("/nonexistent/path");
    const stage = createJudicialRiskStage(repo);

    expect(() => stage(createBaseContext())).toThrow("Judicial risk analysis failed");
  });

  it("should return safe defaults for policy with no judicial actions", () => {
    const repo = new FileJudicialActionRepository(judicialDataDir);
    const stage = createJudicialRiskStage(repo);

    const unknownPolicy: PolicyDecision = {
      ...testPolicy,
      id: "nonexistent-policy-9999",
    };

    const result = stage(createBaseContext({ policy: unknownPolicy }));

    expect(result.metrics).toHaveLength(3);
    const lcr = result.metrics.find((m) => m.metricName === "legal_challenge_risk");
    expect(lcr?.value).toBe(0); // safe default
    const cc = result.metrics.find((m) => m.metricName === "constitutional_compatibility");
    expect(cc?.value).toBe(100); // safe default
  });
});
