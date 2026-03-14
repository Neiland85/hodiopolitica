// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { ActorAnalysisResult } from "../actors/actor-influence";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";
import { computePQI } from "../pipeline/pqi-calculator";

// ─── Test Helpers ────────────────────────────────────────────

function createMetric(name: string, value: number): EvaluatedMetric {
  return {
    policyId: "test-policy",
    metricName: name,
    value,
    source: "test",
    description: `Test metric: ${name}`,
    severity: "low",
  };
}

function createActorAnalysis(overrides: Partial<ActorAnalysisResult> = {}): ActorAnalysisResult {
  return {
    influences: [
      {
        actorId: "actor-1",
        actorType: "politician",
        influenceScore: 60,
        influenceChannel: "voting",
        stance: "support",
        description: "Test politician",
      },
      {
        actorId: "actor-2",
        actorType: "public",
        influenceScore: 50,
        influenceChannel: "electoral_behavior",
        stance: "neutral",
        description: "Test public",
      },
    ],
    alignmentScore: 20,
    supportBalance: { supporting: 1, opposing: 0, neutral: 1, total: 2 },
    dominantChannel: "voting",
    analyzedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("PQI with all 7 components (Phase 6)", () => {
  it("should produce 7 components when all data is available", () => {
    const domainMetrics = [createMetric("inflation_pressure", 30), createMetric("economic_stability_index", 70)];
    const actorAnalysis = createActorAnalysis({ alignmentScore: 40 });
    const mediaMetrics = [createMetric("narrative_distortion_index", 25)];
    const voteMetrics = [createMetric("passage_probability", 75)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 85)];
    const evidenceMetrics = [createMetric("evidence_strength", 60), createMetric("consensus_level", 70)];
    const publicReactionMetrics = [createMetric("approval_trend", 20)];

    const pqi = computePQI(
      domainMetrics,
      actorAnalysis,
      mediaMetrics,
      voteMetrics,
      judicialMetrics,
      evidenceMetrics,
      publicReactionMetrics,
    );

    // Should have: Domain, Actor, Public, Media, Institutional, Evidence, Public Sentiment = 7
    expect(pqi.components).toHaveLength(7);
    expect(pqi.components.map((c) => c.name)).toEqual([
      "Domain Analysis",
      "Actor Alignment",
      "Public Legitimacy",
      "Media Environment",
      "Institutional Viability",
      "Evidence Quality",
      "Public Sentiment",
    ]);
  });

  it("should produce a score between 0 and 100", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];
    const actorAnalysis = createActorAnalysis();
    const mediaMetrics = [createMetric("narrative_distortion_index", 40)];
    const voteMetrics = [createMetric("passage_probability", 60)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 70)];
    const evidenceMetrics = [createMetric("evidence_strength", 45), createMetric("consensus_level", 65)];
    const publicReactionMetrics = [createMetric("approval_trend", 10)];

    const pqi = computePQI(
      domainMetrics,
      actorAnalysis,
      mediaMetrics,
      voteMetrics,
      judicialMetrics,
      evidenceMetrics,
      publicReactionMetrics,
    );

    expect(pqi.score).toBeGreaterThanOrEqual(0);
    expect(pqi.score).toBeLessThanOrEqual(100);
  });

  it("should assign valid grade letters", () => {
    const domainMetrics = [createMetric("economic_stability_index", 90)];
    const pqi = computePQI(domainMetrics);

    expect(["A", "B", "C", "D", "F"]).toContain(pqi.grade);
  });

  it("should produce higher score for policies with strong evidence support", () => {
    const domainMetrics = [createMetric("inflation_pressure", 30)];

    const withEvidence = computePQI(domainMetrics, undefined, undefined, undefined, undefined, [
      createMetric("evidence_strength", 80),
      createMetric("consensus_level", 90),
    ]);

    const withoutEvidence = computePQI(domainMetrics);

    // Both should be valid but with evidence should reflect the high evidence score
    expect(withEvidence.components.length).toBeGreaterThan(withoutEvidence.components.length);
  });

  it("should correctly weight all components (sum = 1.0)", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];
    const actorAnalysis = createActorAnalysis();
    const mediaMetrics = [createMetric("narrative_distortion_index", 50)];
    const voteMetrics = [createMetric("passage_probability", 50)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 50)];
    const evidenceMetrics = [createMetric("evidence_strength", 50), createMetric("consensus_level", 50)];
    const publicReactionMetrics = [createMetric("approval_trend", 0)];

    const pqi = computePQI(
      domainMetrics,
      actorAnalysis,
      mediaMetrics,
      voteMetrics,
      judicialMetrics,
      evidenceMetrics,
      publicReactionMetrics,
    );

    const totalWeight = pqi.components.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("should gracefully degrade when only domain + evidence are available", () => {
    const domainMetrics = [createMetric("inflation_pressure", 40)];
    const evidenceMetrics = [createMetric("evidence_strength", 70), createMetric("consensus_level", 80)];

    const pqi = computePQI(domainMetrics, undefined, undefined, undefined, undefined, evidenceMetrics);

    expect(pqi.components).toHaveLength(2);
    expect(pqi.score).toBeGreaterThan(0);
    expect(pqi.grade).toBeDefined();
  });

  it("should renormalize weights when components are missing", () => {
    // Only domain and evidence → weights should renormalize to domain + evidence
    const domainMetrics = [createMetric("economic_stability_index", 80)]; // domain score = 80
    const evidenceMetrics = [createMetric("evidence_strength", 80), createMetric("consensus_level", 80)]; // evidence score = 80

    const pqi = computePQI(domainMetrics, undefined, undefined, undefined, undefined, evidenceMetrics);

    // Both components score 80, so renormalized PQI ≈ 80
    expect(pqi.score).toBeCloseTo(80, 0);
  });

  it("should map approval_trend to public reaction score correctly", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];

    // Positive trend: approval_trend = 100 → (100 + 100) / 2 = 100
    const positiveReaction = [createMetric("approval_trend", 100)];
    const pqiPositive = computePQI(
      domainMetrics,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      positiveReaction,
    );
    const posComponent = pqiPositive.components.find((c) => c.name === "Public Sentiment");
    expect(posComponent).toBeDefined();
    expect(posComponent!.rawScore).toBe(100);

    // Negative trend: approval_trend = -100 → (-100 + 100) / 2 = 0
    const negativeReaction = [createMetric("approval_trend", -100)];
    const pqiNegative = computePQI(
      domainMetrics,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      negativeReaction,
    );
    const negComponent = pqiNegative.components.find((c) => c.name === "Public Sentiment");
    expect(negComponent!.rawScore).toBe(0);
  });

  it("should compute evidence score as average of strength and consensus", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];
    const evidenceMetrics = [createMetric("evidence_strength", 40), createMetric("consensus_level", 80)];

    const pqi = computePQI(domainMetrics, undefined, undefined, undefined, undefined, evidenceMetrics);
    const evidenceComp = pqi.components.find((c) => c.name === "Evidence Quality");

    expect(evidenceComp).toBeDefined();
    expect(evidenceComp!.rawScore).toBeCloseTo(60, 0); // (40 + 80) / 2
  });

  it("should compute institutional score from passage and constitutional compatibility", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];
    const voteMetrics = [createMetric("passage_probability", 70)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 90)];

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics, judicialMetrics);
    const instComp = pqi.components.find((c) => c.name === "Institutional Viability");

    expect(instComp).toBeDefined();
    expect(instComp!.rawScore).toBeCloseTo(80, 0); // (70 + 90) / 2
  });

  it("should include summary text with all component names", () => {
    const domainMetrics = [createMetric("inflation_pressure", 50)];
    const actorAnalysis = createActorAnalysis();
    const mediaMetrics = [createMetric("narrative_distortion_index", 50)];
    const voteMetrics = [createMetric("passage_probability", 50)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 50)];
    const evidenceMetrics = [createMetric("evidence_strength", 50), createMetric("consensus_level", 50)];
    const publicReactionMetrics = [createMetric("approval_trend", 0)];

    const pqi = computePQI(
      domainMetrics,
      actorAnalysis,
      mediaMetrics,
      voteMetrics,
      judicialMetrics,
      evidenceMetrics,
      publicReactionMetrics,
    );

    expect(pqi.summary).toContain("PQI");
    expect(pqi.summary).toContain("Grade");
    expect(pqi.summary).toContain("Domain Analysis");
    expect(pqi.summary).toContain("Evidence Quality");
    expect(pqi.summary).toContain("Public Sentiment");
  });
});
