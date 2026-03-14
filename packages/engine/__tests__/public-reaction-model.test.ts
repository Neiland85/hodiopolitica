// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { PolicyDecision } from "../policy/policy-decision";
import type { PublicReactionTimeSeries, ReactionDataPoint } from "../public-reaction/public-reaction";
import { analyzePublicReaction } from "../public-reaction/public-reaction-model";

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

function createTimeSeries(dataPoints: ReactionDataPoint[]): PublicReactionTimeSeries {
  return {
    policyId: "housing-law-2023",
    country: "spain",
    dataPoints,
  };
}

function createDataPoint(overrides: Partial<ReactionDataPoint> = {}): ReactionDataPoint {
  return {
    date: "2024-01-01",
    approvalRating: 55,
    protestIntensity: 0.2,
    mediaEngagement: 0.5,
    electoralShift: 1.0,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("Public Reaction Model — analyzePublicReaction()", () => {
  describe("empty input", () => {
    it("should return default metrics when no data points exist", () => {
      const series = createTimeSeries([]);

      const metrics = analyzePublicReaction(testPolicy, series);

      expect(metrics).toHaveLength(3);
      expect(metrics[0].metricName).toBe("approval_trend");
      expect(metrics[0].value).toBe(0);
      expect(metrics[1].metricName).toBe("protest_risk");
      expect(metrics[1].value).toBe(0);
      expect(metrics[2].metricName).toBe("electoral_impact");
      expect(metrics[2].value).toBe(0);
    });
  });

  describe("approval_trend", () => {
    it("should detect a positive trend when ratings increase", () => {
      const series = createTimeSeries([
        createDataPoint({ approvalRating: 40 }),
        createDataPoint({ approvalRating: 50 }),
        createDataPoint({ approvalRating: 60 }),
        createDataPoint({ approvalRating: 70 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const trend = metrics.find((m) => m.metricName === "approval_trend");

      expect(trend).toBeDefined();
      expect(trend!.value).toBeGreaterThan(0);
    });

    it("should detect a negative trend when ratings decrease", () => {
      const series = createTimeSeries([
        createDataPoint({ approvalRating: 70 }),
        createDataPoint({ approvalRating: 60 }),
        createDataPoint({ approvalRating: 50 }),
        createDataPoint({ approvalRating: 40 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const trend = metrics.find((m) => m.metricName === "approval_trend");

      expect(trend!.value).toBeLessThan(0);
    });

    it("should return 0 for a flat trend", () => {
      const series = createTimeSeries([
        createDataPoint({ approvalRating: 50 }),
        createDataPoint({ approvalRating: 50 }),
        createDataPoint({ approvalRating: 50 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const trend = metrics.find((m) => m.metricName === "approval_trend");

      expect(trend!.value).toBe(0);
    });

    it("should clamp to ±100", () => {
      // Extreme slope: 0 → 100 in 2 points → slope = 100 per step × 10 = 1000, clamped to 100
      const series = createTimeSeries([
        createDataPoint({ approvalRating: 0 }),
        createDataPoint({ approvalRating: 100 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const trend = metrics.find((m) => m.metricName === "approval_trend");

      expect(trend!.value).toBeLessThanOrEqual(100);
      expect(trend!.value).toBeGreaterThanOrEqual(-100);
    });

    it("should handle a single data point (no trend)", () => {
      const series = createTimeSeries([createDataPoint({ approvalRating: 60 })]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const trend = metrics.find((m) => m.metricName === "approval_trend");

      // Linear regression with n=1 returns slope=0
      expect(trend!.value).toBe(0);
    });
  });

  describe("protest_risk", () => {
    it("should be 0 when there are no protests", () => {
      const series = createTimeSeries([
        createDataPoint({ protestIntensity: 0 }),
        createDataPoint({ protestIntensity: 0 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const risk = metrics.find((m) => m.metricName === "protest_risk");

      expect(risk!.value).toBe(0);
    });

    it("should reflect peak protest intensity", () => {
      const series = createTimeSeries([
        createDataPoint({ protestIntensity: 0.1 }),
        createDataPoint({ protestIntensity: 0.8 }),
        createDataPoint({ protestIntensity: 0.3 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const risk = metrics.find((m) => m.metricName === "protest_risk");

      // max=0.8 → 0.8 * 50 = 40 base + protest trend contribution
      expect(risk!.value).toBeGreaterThanOrEqual(40);
    });

    it("should increase risk when protests are escalating", () => {
      const escalating = createTimeSeries([
        createDataPoint({ protestIntensity: 0.2 }),
        createDataPoint({ protestIntensity: 0.4 }),
        createDataPoint({ protestIntensity: 0.6 }),
      ]);

      const deescalating = createTimeSeries([
        createDataPoint({ protestIntensity: 0.6 }),
        createDataPoint({ protestIntensity: 0.4 }),
        createDataPoint({ protestIntensity: 0.2 }),
      ]);

      const escMetrics = analyzePublicReaction(testPolicy, escalating);
      const deescMetrics = analyzePublicReaction(testPolicy, deescalating);

      const escRisk = escMetrics.find((m) => m.metricName === "protest_risk")!.value;
      const deescRisk = deescMetrics.find((m) => m.metricName === "protest_risk")!.value;

      // Escalating should have higher risk than de-escalating (same max intensity)
      expect(escRisk).toBeGreaterThan(deescRisk);
    });

    it("should be capped at 100", () => {
      const series = createTimeSeries([
        createDataPoint({ protestIntensity: 1.0 }),
        createDataPoint({ protestIntensity: 1.0 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const risk = metrics.find((m) => m.metricName === "protest_risk");

      expect(risk!.value).toBeLessThanOrEqual(100);
    });
  });

  describe("electoral_impact", () => {
    it("should be positive when electoral shifts are positive", () => {
      const series = createTimeSeries([
        createDataPoint({ electoralShift: 3.0 }),
        createDataPoint({ electoralShift: 2.0 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const impact = metrics.find((m) => m.metricName === "electoral_impact");

      // avg = 2.5 × 10 = 25
      expect(impact!.value).toBe(25);
    });

    it("should be negative when electoral shifts are negative", () => {
      const series = createTimeSeries([
        createDataPoint({ electoralShift: -4.0 }),
        createDataPoint({ electoralShift: -2.0 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const impact = metrics.find((m) => m.metricName === "electoral_impact");

      // avg = -3.0 × 10 = -30
      expect(impact!.value).toBe(-30);
    });

    it("should be clamped to ±100", () => {
      const series = createTimeSeries([
        createDataPoint({ electoralShift: 15.0 }),
        createDataPoint({ electoralShift: 20.0 }),
      ]);

      const metrics = analyzePublicReaction(testPolicy, series);
      const impact = metrics.find((m) => m.metricName === "electoral_impact");

      // avg = 17.5 × 10 = 175 → clamped to 100
      expect(impact!.value).toBe(100);
    });
  });

  describe("metadata", () => {
    it("should include correct source and policyId", () => {
      const series = createTimeSeries([createDataPoint()]);

      const metrics = analyzePublicReaction(testPolicy, series);

      for (const m of metrics) {
        expect(m.policyId).toBe("housing-law-2023");
        expect(m.source).toBe("public-reaction-model");
        expect(m.timestamp).toBeDefined();
      }
    });

    it("should always return exactly 3 metrics", () => {
      const series = createTimeSeries([createDataPoint(), createDataPoint()]);

      const metrics = analyzePublicReaction(testPolicy, series);

      expect(metrics).toHaveLength(3);
      expect(metrics.map((m) => m.metricName)).toEqual(["approval_trend", "protest_risk", "electoral_impact"]);
    });
  });
});
