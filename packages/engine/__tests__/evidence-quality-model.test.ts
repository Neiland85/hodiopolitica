// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { PolicyDecision } from "../policy/policy-decision";
import { evaluateEvidenceBase } from "../research/evidence-quality-model";
import type { ResearchReference } from "../research/research-reference";

// ─── Test Fixtures ───────────────────────────────────────────

const testPolicy: PolicyDecision = {
  id: "housing-law-2023",
  title: "Ley de Vivienda 2023",
  description: "Spanish housing regulation",
  date: new Date(),
  actors: ["gov"],
  objectives: ["affordable-housing"],
  domain: "housing",
};

function createRef(overrides: Partial<ResearchReference> = {}): ResearchReference {
  return {
    id: "ref-test",
    policyId: "housing-law-2023",
    title: "Test Research",
    authors: ["Author A"],
    year: 2024,
    journal: "Test Journal",
    citationCount: 50,
    methodology: "observational",
    relevanceScore: 0.8,
    findings: "Some findings",
    policyAlignment: "supports",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("Evidence Quality Model — evaluateEvidenceBase()", () => {
  describe("empty input", () => {
    it("should return default metrics when no references exist", () => {
      const metrics = evaluateEvidenceBase(testPolicy, []);

      expect(metrics).toHaveLength(3);
      expect(metrics[0].metricName).toBe("evidence_strength");
      expect(metrics[0].value).toBe(0);
      expect(metrics[1].metricName).toBe("methodology_credibility");
      expect(metrics[1].value).toBe(0);
      expect(metrics[2].metricName).toBe("consensus_level");
      expect(metrics[2].value).toBe(50);
    });
  });

  describe("evidence_strength", () => {
    it("should compute strength from methodology weight, citations, and relevance", () => {
      const refs = [createRef({ methodology: "rct", citationCount: 100, relevanceScore: 1.0 })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const strength = metrics.find((m) => m.metricName === "evidence_strength");

      // rct=1.0 × min(100/100,1)=1.0 × 1.0 = 1.0 → avg=1.0 × 100 = 100
      expect(strength).toBeDefined();
      expect(strength!.value).toBe(100);
    });

    it("should cap citation factor at 1.0 for high-citation papers", () => {
      const refs = [createRef({ methodology: "rct", citationCount: 500, relevanceScore: 1.0 })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const strength = metrics.find((m) => m.metricName === "evidence_strength");

      // citationFactor = min(500/100, 1) = 1.0 → same as 100 citations
      expect(strength!.value).toBe(100);
    });

    it("should produce weak strength for low-quality evidence", () => {
      const refs = [createRef({ methodology: "expert_opinion", citationCount: 10, relevanceScore: 0.3 })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const strength = metrics.find((m) => m.metricName === "evidence_strength");

      // expert_opinion=0.2 × min(10/100,1)=0.1 × 0.3 = 0.006 → avg=0.006 × 100 = 0.6
      expect(strength!.value).toBeLessThan(5);
    });

    it("should average across multiple references", () => {
      const refs = [
        createRef({ methodology: "rct", citationCount: 100, relevanceScore: 1.0 }),
        createRef({ methodology: "expert_opinion", citationCount: 10, relevanceScore: 0.5 }),
      ];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const strength = metrics.find((m) => m.metricName === "evidence_strength");

      // ref1: 1.0 × 1.0 × 1.0 = 1.0
      // ref2: 0.2 × 0.1 × 0.5 = 0.01
      // avg: (1.0 + 0.01) / 2 = 0.505 → × 100 = 50.5
      expect(strength!.value).toBeCloseTo(50.5, 0);
    });
  });

  describe("methodology_credibility", () => {
    it("should score 100 for all RCT evidence", () => {
      const refs = [createRef({ methodology: "rct" }), createRef({ methodology: "rct" })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const credibility = metrics.find((m) => m.metricName === "methodology_credibility");

      // (1.0 + 1.0) / 2 × 100 = 100
      expect(credibility!.value).toBe(100);
    });

    it("should score low for all expert_opinion evidence", () => {
      const refs = [createRef({ methodology: "expert_opinion" }), createRef({ methodology: "expert_opinion" })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const credibility = metrics.find((m) => m.metricName === "methodology_credibility");

      // (0.2 + 0.2) / 2 × 100 = 20
      expect(credibility!.value).toBe(20);
    });

    it("should compute weighted average for mixed methodologies", () => {
      const refs = [
        createRef({ methodology: "rct" }), // 1.0
        createRef({ methodology: "meta_analysis" }), // 0.9
        createRef({ methodology: "observational" }), // 0.6
      ];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const credibility = metrics.find((m) => m.metricName === "methodology_credibility");

      // (1.0 + 0.9 + 0.6) / 3 × 100 ≈ 83.33
      expect(credibility!.value).toBeCloseTo(83.33, 1);
    });
  });

  describe("consensus_level", () => {
    it("should be 100 when all references support the policy", () => {
      const refs = [createRef({ policyAlignment: "supports" }), createRef({ policyAlignment: "supports" })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const consensus = metrics.find((m) => m.metricName === "consensus_level");

      // (2 - 0) / 2 × 50 + 50 = 100
      expect(consensus!.value).toBe(100);
    });

    it("should be 0 when all references challenge the policy", () => {
      const refs = [createRef({ policyAlignment: "challenges" }), createRef({ policyAlignment: "challenges" })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const consensus = metrics.find((m) => m.metricName === "consensus_level");

      // (0 - 2) / 2 × 50 + 50 = 0
      expect(consensus!.value).toBe(0);
    });

    it("should be 50 when evidence is split", () => {
      const refs = [createRef({ policyAlignment: "supports" }), createRef({ policyAlignment: "challenges" })];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const consensus = metrics.find((m) => m.metricName === "consensus_level");

      // (1 - 1) / 2 × 50 + 50 = 50
      expect(consensus!.value).toBe(50);
    });

    it("should handle neutral references (they dilute consensus)", () => {
      const refs = [
        createRef({ policyAlignment: "supports" }),
        createRef({ policyAlignment: "neutral" }),
        createRef({ policyAlignment: "neutral" }),
      ];

      const metrics = evaluateEvidenceBase(testPolicy, refs);
      const consensus = metrics.find((m) => m.metricName === "consensus_level");

      // (1 - 0) / 3 × 50 + 50 ≈ 66.67
      expect(consensus!.value).toBeCloseTo(66.67, 1);
    });
  });

  describe("metadata", () => {
    it("should include correct source and policyId", () => {
      const refs = [createRef()];

      const metrics = evaluateEvidenceBase(testPolicy, refs);

      for (const m of metrics) {
        expect(m.policyId).toBe("housing-law-2023");
        expect(m.source).toBe("evidence-quality-model");
        expect(m.timestamp).toBeDefined();
      }
    });

    it("should always return exactly 3 metrics", () => {
      const refs = [createRef(), createRef(), createRef()];

      const metrics = evaluateEvidenceBase(testPolicy, refs);

      expect(metrics).toHaveLength(3);
      expect(metrics.map((m) => m.metricName)).toEqual([
        "evidence_strength",
        "methodology_credibility",
        "consensus_level",
      ]);
    });
  });
});
