// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Actor Model — Political actors involved in policy decisions.
 *
 * Each actor type represents a distinct group with specific
 * measurable attributes that determine their influence on policy outcomes.
 *
 * ## Actor Types
 *
 * - **politician**: Governing party, opposition — voting power, media presence
 * - **legislative**: Parliament, senate — legislative capacity, amendment power
 * - **judicial**: Courts, constitutional tribunal — legal review, precedent setting
 * - **media**: TV, press, digital outlets — coverage volume, editorial bias, reach
 * - **journalist**: Investigative, opinion writers — depth, trust, independence
 * - **researcher**: Think tanks, universities — rigor, citations, policy influence
 * - **public**: Citizens, civil society — approval, protest intensity, electoral impact
 */

export type ActorType = "politician" | "legislative" | "judicial" | "media" | "journalist" | "researcher" | "public";

/**
 * A political actor or actor group involved in policy decisions.
 */
export interface Actor {
  /** Unique identifier (kebab-case, e.g. "governing-party-spain") */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Category of actor */
  readonly type: ActorType;
  /** Country or jurisdiction */
  readonly country: string;
  /** Actor-specific measurable attributes */
  readonly attributes: ActorAttributes;
}

/**
 * Discriminated union of actor attributes.
 * The `type` field acts as discriminant for type narrowing.
 */
export type ActorAttributes =
  | PoliticianAttributes
  | LegislativeAttributes
  | JudicialAttributes
  | MediaAttributes
  | JournalistAttributes
  | ResearcherAttributes
  | PublicAttributes;

export interface PoliticianAttributes {
  readonly type: "politician";
  /** Percentage of parliamentary seats controlled (0-100) */
  readonly votingPower: number;
  /** Media mentions per week */
  readonly mediaPresence: number;
  /** Coalition leverage index (0-1) */
  readonly coalitionLeverage: number;
}

export interface LegislativeAttributes {
  readonly type: "legislative";
  /** Seats controlled / total seats (0-1) */
  readonly legislativeCapacity: number;
  /** Amendment success rate (0-1) */
  readonly amendmentPower: number;
  /** Has veto power */
  readonly vetoPower: boolean;
}

export interface JudicialAttributes {
  readonly type: "judicial";
  /** Likelihood of legal review (0-1) */
  readonly legalReviewPower: number;
  /** Number of relevant precedents set */
  readonly precedentSetting: number;
}

export interface MediaAttributes {
  readonly type: "media";
  /** Audience reach in millions */
  readonly reach: number;
  /** Editorial bias score (-1 = left, 0 = center, 1 = right) */
  readonly editorialBias: number;
  /** Daily coverage volume (mentions/day) */
  readonly coverageVolume: number;
}

export interface JournalistAttributes {
  readonly type: "journalist";
  /** Investigative depth score (0-1) */
  readonly investigativeDepth: number;
  /** Public trust rating (0-1) */
  readonly publicTrust: number;
  /** Editorial independence index (0-1) */
  readonly independence: number;
}

export interface ResearcherAttributes {
  readonly type: "researcher";
  /** Methodology rigor score (0-1) */
  readonly methodologyRigor: number;
  /** Citation impact factor */
  readonly citationImpact: number;
  /** Policy influence index (0-1) */
  readonly policyInfluence: number;
}

export interface PublicAttributes {
  readonly type: "public";
  /** Current approval rating for the policy (0-100) */
  readonly approvalRating: number;
  /** Protest intensity index (0-1) */
  readonly protestIntensity: number;
  /** Electoral impact weight (0-1) */
  readonly electoralImpact: number;
}

/** All valid actor types for validation */
export const VALID_ACTOR_TYPES: readonly ActorType[] = [
  "politician",
  "legislative",
  "judicial",
  "media",
  "journalist",
  "researcher",
  "public",
] as const;
