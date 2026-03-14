// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { ActorAnalysisResult } from "../actors/actor-influence";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";

/**
 * Policy Quality Index — composite score.
 */
export interface PolicyQualityIndex {
  /** Composite score (0-100) */
  readonly score: number;
  /** Grade: A (80-100), B (60-79), C (40-59), D (20-39), F (0-19) */
  readonly grade: PQIGrade;
  /** Breakdown of each component */
  readonly components: PQIComponent[];
  /** Human-readable summary */
  readonly summary: string;
}

export type PQIGrade = "A" | "B" | "C" | "D" | "F";

export interface PQIComponent {
  readonly name: string;
  readonly weight: number;
  readonly rawScore: number;
  readonly weightedScore: number;
  readonly description: string;
}

/**
 * Final PQI component weights (Phase 6).
 *
 * When all data is available:
 *   - Domain metrics:      0.30 (primary economic/social analysis)
 *   - Actor alignment:     0.15 (political feasibility)
 *   - Media sentiment:     0.10 (public narrative)
 *   - Public approval:     0.10 (democratic legitimacy from actors)
 *   - Institutional:       0.10 (votes + judicial viability)
 *   - Evidence quality:    0.15 (scientific evidence base)
 *   - Public reaction:     0.10 (public opinion trends)
 *
 * When components are missing, weights are renormalized proportionally.
 */
const PQI_WEIGHTS = {
  domain: 0.3,
  actors: 0.15,
  media: 0.1,
  public: 0.1,
  institutional: 0.1,
  evidence: 0.15,
  publicReaction: 0.1,
} as const;

/**
 * Computes the Policy Quality Index from all available analysis results.
 *
 * Pure function — deterministic output for given inputs.
 *
 * ## Scoring
 *
 * ### Domain Score (0-100, inverted from stress metrics)
 * Takes the average of all domain metrics, inverted so that low stress = high quality.
 *
 * ### Actor Alignment Score (0-100)
 * Maps alignment from [-100, 100] to [0, 100]: (alignmentScore + 100) / 2
 *
 * ### Media Score (0-100, inverted from distortion)
 * Uses 100 - narrative_distortion_index as the quality measure.
 *
 * ### Public Score (0-100)
 * If actor analysis includes public actors, uses their approval rating.
 *
 * ### Institutional Score (0-100)
 * Combines passage_probability with constitutional_compatibility.
 *
 * ### Evidence Score (0-100)
 * Combines evidence_strength with consensus_level.
 *
 * ### Public Reaction Score (0-100)
 * Maps approval_trend from [-100, 100] to [0, 100].
 */
export function computePQI(
  domainMetrics: EvaluatedMetric[],
  actorAnalysis?: ActorAnalysisResult,
  mediaMetrics?: EvaluatedMetric[],
  voteMetrics?: EvaluatedMetric[],
  judicialMetrics?: EvaluatedMetric[],
  evidenceMetrics?: EvaluatedMetric[],
  publicReactionMetrics?: EvaluatedMetric[],
): PolicyQualityIndex {
  const components: PQIComponent[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  // 1. Domain Score (always available)
  const domainScore = computeDomainScore(domainMetrics);
  components.push({
    name: "Domain Analysis",
    weight: PQI_WEIGHTS.domain,
    rawScore: domainScore,
    weightedScore: round(domainScore * PQI_WEIGHTS.domain),
    description: "Economic and social impact assessment from domain-specific models",
  });
  totalWeight += PQI_WEIGHTS.domain;
  weightedSum += domainScore * PQI_WEIGHTS.domain;

  // 2. Actor Alignment (optional)
  if (actorAnalysis) {
    const actorScore = computeActorScore(actorAnalysis);
    components.push({
      name: "Actor Alignment",
      weight: PQI_WEIGHTS.actors,
      rawScore: actorScore,
      weightedScore: round(actorScore * PQI_WEIGHTS.actors),
      description: "Political feasibility based on actor support and opposition balance",
    });
    totalWeight += PQI_WEIGHTS.actors;
    weightedSum += actorScore * PQI_WEIGHTS.actors;

    // Public approval component (derived from actor analysis)
    const publicScore = computePublicScore(actorAnalysis);
    components.push({
      name: "Public Legitimacy",
      weight: PQI_WEIGHTS.public,
      rawScore: publicScore,
      weightedScore: round(publicScore * PQI_WEIGHTS.public),
      description: "Democratic legitimacy derived from public approval and engagement",
    });
    totalWeight += PQI_WEIGHTS.public;
    weightedSum += publicScore * PQI_WEIGHTS.public;
  }

  // 3. Media Score (optional)
  if (mediaMetrics && mediaMetrics.length > 0) {
    const mediaScore = computeMediaScore(mediaMetrics);
    components.push({
      name: "Media Environment",
      weight: PQI_WEIGHTS.media,
      rawScore: mediaScore,
      weightedScore: round(mediaScore * PQI_WEIGHTS.media),
      description: "Quality of media coverage and narrative balance",
    });
    totalWeight += PQI_WEIGHTS.media;
    weightedSum += mediaScore * PQI_WEIGHTS.media;
  }

  // 4. Institutional Score (optional — from votes + judicial data)
  const hasVotes = voteMetrics && voteMetrics.length > 0;
  const hasJudicial = judicialMetrics && judicialMetrics.length > 0;
  if (hasVotes || hasJudicial) {
    const institutionalScore = computeInstitutionalScore(voteMetrics, judicialMetrics);
    components.push({
      name: "Institutional Viability",
      weight: PQI_WEIGHTS.institutional,
      rawScore: institutionalScore,
      weightedScore: round(institutionalScore * PQI_WEIGHTS.institutional),
      description: "Parliamentary support and judicial compatibility assessment",
    });
    totalWeight += PQI_WEIGHTS.institutional;
    weightedSum += institutionalScore * PQI_WEIGHTS.institutional;
  }

  // 5. Evidence Quality (optional — from research references)
  if (evidenceMetrics && evidenceMetrics.length > 0) {
    const evidenceScore = computeEvidenceScore(evidenceMetrics);
    components.push({
      name: "Evidence Quality",
      weight: PQI_WEIGHTS.evidence,
      rawScore: evidenceScore,
      weightedScore: round(evidenceScore * PQI_WEIGHTS.evidence),
      description: "Strength and quality of scientific evidence supporting the policy",
    });
    totalWeight += PQI_WEIGHTS.evidence;
    weightedSum += evidenceScore * PQI_WEIGHTS.evidence;
  }

  // 6. Public Reaction (optional — from public reaction time series)
  if (publicReactionMetrics && publicReactionMetrics.length > 0) {
    const reactionScore = computePublicReactionScore(publicReactionMetrics);
    components.push({
      name: "Public Sentiment",
      weight: PQI_WEIGHTS.publicReaction,
      rawScore: reactionScore,
      weightedScore: round(reactionScore * PQI_WEIGHTS.publicReaction),
      description: "Public opinion trends and approval trajectory over time",
    });
    totalWeight += PQI_WEIGHTS.publicReaction;
    weightedSum += reactionScore * PQI_WEIGHTS.publicReaction;
  }

  // Renormalize weights if not all components are present
  const score = totalWeight > 0 ? round((weightedSum / totalWeight) * 100) / 100 : 0;
  const normalizedScore = round(score);
  const grade = assignGrade(normalizedScore);

  return {
    score: normalizedScore,
    grade,
    components,
    summary: buildSummary(normalizedScore, grade, components),
  };
}

// ─── Component Scoring Functions ────────────────────────────

/**
 * Inverted metrics where higher value = better quality.
 */
const INVERTED_METRICS = new Set([
  "youth_opportunity_index",
  "public_health_sustainability",
  "economic_stability_index",
  "green_transition_capacity",
]);

function computeDomainScore(metrics: EvaluatedMetric[]): number {
  if (metrics.length === 0) return 50; // Neutral default

  let sum = 0;
  for (const m of metrics) {
    if (INVERTED_METRICS.has(m.metricName)) {
      // Already on a 0-100 scale where higher is better
      sum += Math.min(Math.max(m.value, 0), 100);
    } else {
      // Stress metrics: lower is better, invert to 0-100 scale
      sum += Math.max(100 - m.value, 0);
    }
  }

  return round(sum / metrics.length);
}

function computeActorScore(analysis: ActorAnalysisResult): number {
  // Map [-100, 100] alignment to [0, 100]
  return round((analysis.alignmentScore + 100) / 2);
}

function computePublicScore(analysis: ActorAnalysisResult): number {
  // Find public actor influences
  const publicInfluences = analysis.influences.filter((i) => i.actorType === "public");

  if (publicInfluences.length === 0) {
    // Fallback: derive from overall alignment
    return round((analysis.alignmentScore + 100) / 2);
  }

  // Average public influence scores (they reflect approval and engagement)
  const sum = publicInfluences.reduce((acc, i) => acc + i.influenceScore, 0);
  return round(sum / publicInfluences.length);
}

function computeMediaScore(metrics: EvaluatedMetric[]): number {
  // Find narrative distortion metric
  const distortion = metrics.find((m) => m.metricName === "narrative_distortion_index");

  if (distortion) {
    // Invert: low distortion = high quality
    return round(Math.max(100 - distortion.value, 0));
  }

  // Fallback: use inverse of media influence score (lower influence = less manipulation)
  const influence = metrics.find((m) => m.metricName === "media_influence_score");
  if (influence) {
    return round(Math.max(100 - influence.value, 0));
  }

  return 50; // Neutral default
}

/**
 * Computes the institutional score from vote and judicial metrics.
 */
function computeInstitutionalScore(voteMetrics?: EvaluatedMetric[], judicialMetrics?: EvaluatedMetric[]): number {
  let score = 0;
  let count = 0;

  if (voteMetrics && voteMetrics.length > 0) {
    const passage = voteMetrics.find((m) => m.metricName === "passage_probability");
    if (passage) {
      score += passage.value;
      count++;
    }
  }

  if (judicialMetrics && judicialMetrics.length > 0) {
    const compatibility = judicialMetrics.find((m) => m.metricName === "constitutional_compatibility");
    if (compatibility) {
      score += compatibility.value;
      count++;
    }
  }

  return count > 0 ? round(score / count) : 50;
}

/**
 * Computes the evidence quality score from research metrics.
 *
 * Combines evidence_strength (how robust the evidence is) with
 * consensus_level (how much agreement exists).
 */
function computeEvidenceScore(metrics: EvaluatedMetric[]): number {
  let score = 0;
  let count = 0;

  const strength = metrics.find((m) => m.metricName === "evidence_strength");
  if (strength) {
    score += strength.value;
    count++;
  }

  const consensus = metrics.find((m) => m.metricName === "consensus_level");
  if (consensus) {
    score += consensus.value;
    count++;
  }

  return count > 0 ? round(score / count) : 50;
}

/**
 * Computes the public reaction score from time series metrics.
 *
 * Maps approval_trend from [-100, 100] to [0, 100].
 * Positive trends = higher score = better public reception.
 */
function computePublicReactionScore(metrics: EvaluatedMetric[]): number {
  const trend = metrics.find((m) => m.metricName === "approval_trend");
  if (trend) {
    // Map [-100, 100] → [0, 100]
    return round((trend.value + 100) / 2);
  }

  return 50; // Neutral default
}

// ─── Grade Assignment ───────────────────────────────────────

function assignGrade(score: number): PQIGrade {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

// ─── Summary Builder ────────────────────────────────────────

function buildSummary(score: number, grade: PQIGrade, components: PQIComponent[]): string {
  const componentNames = components.map((c) => c.name).join(", ");
  const gradeLabel = {
    A: "Excellent",
    B: "Good",
    C: "Moderate",
    D: "Poor",
    F: "Critical",
  }[grade];

  return `PQI ${score}/100 (Grade ${grade} — ${gradeLabel}). Based on: ${componentNames}.`;
}

// ─── Helpers ────────────────────────────────────────────────

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
