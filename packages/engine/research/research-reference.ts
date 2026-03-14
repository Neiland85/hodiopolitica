// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Research Reference — scientific evidence supporting or challenging a policy.
 *
 * Represents a single research study or publication that provides
 * evidence about a policy's expected outcomes, effectiveness, or risks.
 */

/**
 * Research methodology type, ordered by evidence strength.
 */
export type ResearchMethodology = "rct" | "meta_analysis" | "observational" | "case_study" | "expert_opinion";

/**
 * Whether the research supports, challenges, or is neutral to the policy.
 */
export type PolicyAlignment = "supports" | "challenges" | "neutral";

/**
 * A research reference associated with a policy decision.
 * This is the input to the evidence quality model.
 */
export interface ResearchReference {
  /** Unique identifier for the reference */
  readonly id: string;
  /** Reference to the policy being analyzed */
  readonly policyId: string;
  /** Title of the research publication */
  readonly title: string;
  /** Authors of the study */
  readonly authors: string[];
  /** Year of publication */
  readonly year: number;
  /** Journal or publication venue */
  readonly journal: string;
  /** Number of citations */
  readonly citationCount: number;
  /** Research methodology used */
  readonly methodology: ResearchMethodology;
  /** Relevance to the policy (0-1) */
  readonly relevanceScore: number;
  /** Summary of key findings */
  readonly findings: string;
  /** Whether findings support, challenge, or are neutral to the policy */
  readonly policyAlignment: PolicyAlignment;
}
