// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { MediaCoverage } from "../media/media-coverage";
import { evaluateMediaInfluence } from "../media/media-influence-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-policy",
  title: "Test Policy",
  description: "A test policy for media analysis",
  date: new Date("2023-01-01"),
  actors: ["gobierno"],
  objectives: ["test"],
  domain: "housing",
};

const baseCoverage: MediaCoverage = {
  policyId: "test-policy",
  country: "Spain",
  period: { startDate: "2023-01-01", endDate: "2023-03-31" },
  mentionsPerDay: 50,
  sentiment: { positive: 0.3, negative: 0.4, neutral: 0.3 },
  audienceReach: 10,
  engagementRate: 0.1,
  sources: ["Test Source"],
};

describe("evaluateMediaInfluence", () => {
  it("returns exactly 3 metrics", () => {
    const metrics = evaluateMediaInfluence(basePolicy, baseCoverage);

    expect(metrics).toHaveLength(3);
    expect(metrics.map((m) => m.metricName)).toEqual([
      "media_influence_score",
      "narrative_distortion_index",
      "polarization_amplification",
    ]);
  });

  it("computes media_influence_score correctly", () => {
    const metrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const mis = metrics[0];

    // (mentionsPerDay/100) * (audienceReach * engagementRate) * (1 + |positive - negative|)
    // (50/100) * (10 * 0.1) * (1 + |0.3 - 0.4|) = 0.5 * 1 * 1.1 = 0.55
    expect(mis.value).toBe(0.55);
    expect(mis.policyId).toBe("test-policy");
    expect(mis.source).toBe("media-influence-model");
  });

  it("computes narrative_distortion_index correctly", () => {
    const metrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const ndi = metrics[1];

    // (1 - neutral) * |positive - negative| * 100
    // (1 - 0.3) * |0.3 - 0.4| * 100 = 0.7 * 0.1 * 100 = 7
    expect(ndi.value).toBe(7);
  });

  it("computes polarization_amplification correctly", () => {
    const metrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const pa = metrics[2];

    // (mentionsPerDay/50) * (1 - neutral) * audienceReach
    // (50/50) * (1 - 0.3) * 10 = 1 * 0.7 * 10 = 7
    expect(pa.value).toBe(7);
  });

  it("produces higher scores with polarized sentiment", () => {
    const polarized: MediaCoverage = {
      ...baseCoverage,
      sentiment: { positive: 0.1, negative: 0.8, neutral: 0.1 },
    };

    const normalMetrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const polarizedMetrics = evaluateMediaInfluence(basePolicy, polarized);

    expect(polarizedMetrics[0].value).toBeGreaterThan(normalMetrics[0].value); // Higher influence
    expect(polarizedMetrics[1].value).toBeGreaterThan(normalMetrics[1].value); // Higher distortion
  });

  it("produces lower distortion with balanced coverage", () => {
    const balanced: MediaCoverage = {
      ...baseCoverage,
      sentiment: { positive: 0.1, negative: 0.1, neutral: 0.8 },
    };

    const metrics = evaluateMediaInfluence(basePolicy, balanced);

    // (1-0.8) * |0.1-0.1| * 100 = 0.2 * 0 * 100 = 0
    expect(metrics[1].value).toBe(0); // Zero distortion when balanced
  });

  it("scales with audience reach", () => {
    const largeAudience: MediaCoverage = {
      ...baseCoverage,
      audienceReach: 50,
    };

    const smallMetrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const largeMetrics = evaluateMediaInfluence(basePolicy, largeAudience);

    expect(largeMetrics[0].value).toBeGreaterThan(smallMetrics[0].value);
    expect(largeMetrics[2].value).toBeGreaterThan(smallMetrics[2].value);
  });

  it("scales with coverage volume", () => {
    const highVolume: MediaCoverage = {
      ...baseCoverage,
      mentionsPerDay: 200,
    };

    const normalMetrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const highMetrics = evaluateMediaInfluence(basePolicy, highVolume);

    expect(highMetrics[0].value).toBeGreaterThan(normalMetrics[0].value);
    expect(highMetrics[2].value).toBeGreaterThan(normalMetrics[2].value);
  });

  it("handles zero mentions gracefully", () => {
    const noCoverage: MediaCoverage = {
      ...baseCoverage,
      mentionsPerDay: 0,
    };

    const metrics = evaluateMediaInfluence(basePolicy, noCoverage);

    expect(metrics[0].value).toBe(0);
    expect(metrics[2].value).toBe(0);
  });

  it("handles perfectly neutral sentiment", () => {
    const neutral: MediaCoverage = {
      ...baseCoverage,
      sentiment: { positive: 0, negative: 0, neutral: 1.0 },
    };

    const metrics = evaluateMediaInfluence(basePolicy, neutral);

    // distortion = (1-1) * 0 * 100 = 0
    expect(metrics[1].value).toBe(0);
    // polarization = (50/50) * (1-1) * 10 = 0
    expect(metrics[2].value).toBe(0);
  });

  it("includes timestamp in each metric", () => {
    const before = new Date();
    const metrics = evaluateMediaInfluence(basePolicy, baseCoverage);
    const after = new Date();

    for (const m of metrics) {
      expect(m.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(m.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });

  it("produces high scores for France pension reform scenario", () => {
    const franceCoverage: MediaCoverage = {
      policyId: "pension-reform-2023",
      country: "France",
      period: { startDate: "2023-01-01", endDate: "2023-04-30" },
      mentionsPerDay: 125,
      sentiment: { positive: 0.2, negative: 0.55, neutral: 0.25 },
      audienceReach: 22.0,
      engagementRate: 0.18,
      sources: ["Le Monde"],
    };

    const metrics = evaluateMediaInfluence(basePolicy, franceCoverage);

    // High coverage + polarized sentiment = high scores
    expect(metrics[0].value).toBeGreaterThan(5); // Significant influence
    expect(metrics[1].value).toBeGreaterThan(20); // Notable distortion
    expect(metrics[2].value).toBeGreaterThan(30); // Strong polarization
  });
});
