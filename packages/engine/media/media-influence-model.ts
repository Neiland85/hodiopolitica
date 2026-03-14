// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyMetric } from "../metrics/policy-metric";
import type { PolicyDecision } from "../policy/policy-decision";
import type { MediaCoverage } from "./media-coverage";

/**
 * Media Influence Model
 *
 * Computes three key metrics that measure media's impact on policy outcomes.
 * Pure function — no side effects, deterministic output for given inputs.
 *
 * ## Metrics
 *
 * ### media_influence_score
 * Formula: (mentionsPerDay / 100) * (audienceReach * engagementRate) * sentimentAmplifier
 * Where sentimentAmplifier = 1 + |positive - negative|
 *
 * Rationale: Captures the overall volume and reach of media coverage,
 * amplified by how polarized the sentiment is. High mentions + large
 * audience + polarized sentiment = maximum influence.
 *
 * Interpretation:
 *   - < 30:  Low influence — policy receives minimal media attention
 *   - 30-60: Moderate — steady coverage shaping public perception
 *   - 60-90: High — dominant media narrative forming
 *   - > 90:  Critical — media saturation, potential agenda-setting
 *
 * ### narrative_distortion_index
 * Formula: (1 - neutral) * |positive - negative| * 100
 *
 * Rationale: Measures how far coverage deviates from balanced reporting.
 * When most coverage is polarized (low neutral) AND heavily skewed
 * (large gap between positive and negative), narrative distortion is high.
 *
 * Interpretation:
 *   - < 25:  Low — balanced, factual reporting dominates
 *   - 25-50: Moderate — noticeable editorial framing
 *   - 50-75: High — significant narrative bias
 *   - > 75:  Critical — propaganda-level distortion
 *
 * ### polarization_amplification
 * Formula: (mentionsPerDay / 50) * (1 - neutral) * audienceReach
 *
 * Rationale: Captures how high-volume polarized coverage amplifies
 * societal division. Combines coverage frequency, polarization level,
 * and audience size into a single amplification measure.
 *
 * Interpretation:
 *   - < 20:  Low — minimal polarization effect
 *   - 20-50: Moderate — measurable societal impact
 *   - 50-80: High — significant polarization driver
 *   - > 80:  Critical — major social division catalyst
 */
export function evaluateMediaInfluence(decision: PolicyDecision, coverage: MediaCoverage): PolicyMetric[] {
  const { mentionsPerDay, audienceReach, engagementRate, sentiment } = coverage;

  // Sentiment amplifier: how polarized is the coverage?
  const sentimentGap = Math.abs(sentiment.positive - sentiment.negative);
  const sentimentAmplifier = 1 + sentimentGap;

  // Metric 1: Media Influence Score
  const mediaInfluenceScore = (mentionsPerDay / 100) * (audienceReach * engagementRate) * sentimentAmplifier;

  // Metric 2: Narrative Distortion Index
  const narrativeDistortion = (1 - sentiment.neutral) * sentimentGap * 100;

  // Metric 3: Polarization Amplification
  const polarizationAmplification = (mentionsPerDay / 50) * (1 - sentiment.neutral) * audienceReach;

  return [
    {
      policyId: decision.id,
      metricName: "media_influence_score",
      value: round(mediaInfluenceScore),
      source: "media-influence-model",
      timestamp: new Date(),
      description:
        "Measures overall media impact combining coverage volume, audience reach, engagement, and sentiment polarization.",
    },
    {
      policyId: decision.id,
      metricName: "narrative_distortion_index",
      value: round(narrativeDistortion),
      source: "media-influence-model",
      timestamp: new Date(),
      description:
        "Measures how far media coverage deviates from balanced reporting. High values indicate strong editorial framing.",
    },
    {
      policyId: decision.id,
      metricName: "polarization_amplification",
      value: round(polarizationAmplification),
      source: "media-influence-model",
      timestamp: new Date(),
      description: "Captures how high-volume polarized coverage amplifies societal division across the audience.",
    },
  ];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
