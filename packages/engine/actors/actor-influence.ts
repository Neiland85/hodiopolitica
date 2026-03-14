// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { ActorType } from "./actor";

/**
 * Influence channels — the mechanism through which an actor exerts influence.
 *
 * Each actor type uses characteristic channels:
 * - Politicians: voting, coalition_deal, public_messaging
 * - Legislative: amendment, procedural_delay, committee_report
 * - Judicial: court_ruling, injunction, constitutional_review
 * - Media: media_coverage, narrative_framing
 * - Journalists: investigation, evidence_publication
 * - Researchers: evidence_publication, policy_recommendation
 * - Public: polling, protest, electoral_behavior
 */
export type InfluenceChannel =
  | "voting"
  | "coalition_deal"
  | "public_messaging"
  | "amendment"
  | "procedural_delay"
  | "committee_report"
  | "court_ruling"
  | "injunction"
  | "constitutional_review"
  | "media_coverage"
  | "narrative_framing"
  | "investigation"
  | "evidence_publication"
  | "policy_recommendation"
  | "polling"
  | "protest"
  | "electoral_behavior";

/**
 * Actor's position on a policy.
 */
export type ActorStance = "support" | "oppose" | "neutral";

/**
 * Computed influence of a single actor on a specific policy.
 * This is the output of per-actor analysis.
 */
export interface ActorInfluence {
  /** Reference to the actor */
  readonly actorId: string;
  /** Actor category for grouping */
  readonly actorType: ActorType;
  /** Overall influence score (0-100) */
  readonly influenceScore: number;
  /** How this influence manifests */
  readonly influenceChannel: InfluenceChannel;
  /** Direction: supports, opposes, or neutral toward the policy */
  readonly stance: ActorStance;
  /** Human-readable explanation of the influence */
  readonly description: string;
}

/**
 * Aggregate result of analyzing all actors for a policy.
 *
 * Produced by `analyzeActors()` in actor-analyzer.ts.
 */
export interface ActorAnalysisResult {
  /** All individual actor influences */
  readonly influences: ActorInfluence[];
  /** Weighted alignment score: how aligned actors are with policy objectives (-100 to 100) */
  readonly alignmentScore: number;
  /** Count of supporting vs opposing actors */
  readonly supportBalance: SupportBalance;
  /** Most common influence channel across all actors */
  readonly dominantChannel: InfluenceChannel;
  /** Timestamp of analysis */
  readonly analyzedAt: Date;
}

export interface SupportBalance {
  readonly support: number;
  readonly oppose: number;
  readonly neutral: number;
}
