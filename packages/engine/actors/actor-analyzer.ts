// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyDecision } from "../policy/policy-decision";
import type {
  Actor,
  JournalistAttributes,
  JudicialAttributes,
  LegislativeAttributes,
  MediaAttributes,
  PoliticianAttributes,
  PublicAttributes,
  ResearcherAttributes,
} from "./actor";
import type { ActorAnalysisResult, ActorInfluence, ActorStance, InfluenceChannel } from "./actor-influence";

/**
 * Actor Analyzer — computes how a set of political actors influence a policy.
 *
 * ## Design
 *
 * Pure function following the same pattern as housing-policy-model.ts.
 * No side effects, deterministic output for given inputs.
 *
 * ## Scoring Formulas (per actor type)
 *
 * ### politician
 * `influenceScore = votingPower * 0.5 + mediaPresence * 0.2 + coalitionLeverage * 30`
 * Rationale: Voting power is the primary mechanism (0-100 → 0-50),
 * media presence amplifies reach (mentions/week scaled by 0.2),
 * coalition leverage provides structural power (0-1 → 0-30).
 *
 * ### legislative
 * `influenceScore = legislativeCapacity * 50 + amendmentPower * 30 + (vetoPower ? 20 : 0)`
 * Rationale: Capacity to pass legislation dominates (0-1 → 0-50),
 * amendment success adds procedural influence (0-1 → 0-30),
 * veto power is binary but significant (+20).
 *
 * ### judicial
 * `influenceScore = legalReviewPower * 70 + min(precedentSetting * 3, 30)`
 * Rationale: Legal review power is the primary mechanism (0-1 → 0-70),
 * precedent count adds weight (3 points each, capped at 30).
 *
 * ### media
 * `influenceScore = min(reach * 2, 40) + min(coverageVolume * 0.3, 30) + (1 - |editorialBias|) * 30`
 * Rationale: Reach provides base influence (millions → capped at 40),
 * coverage volume adds persistence (capped at 30),
 * editorial neutrality increases credibility (0-1 → 0-30).
 *
 * ### journalist
 * `influenceScore = investigativeDepth * 40 + publicTrust * 35 + independence * 25`
 * Rationale: Investigation quality is primary (0-1 → 0-40),
 * public trust amplifies impact (0-1 → 0-35),
 * editorial independence ensures credibility (0-1 → 0-25).
 *
 * ### researcher
 * `influenceScore = methodologyRigor * 35 + min(citationImpact * 5, 30) + policyInfluence * 35`
 * Rationale: Rigor provides evidence quality (0-1 → 0-35),
 * citation impact adds academic weight (5 per unit, capped at 30),
 * direct policy influence captures real-world effect (0-1 → 0-35).
 *
 * ### public
 * `influenceScore = approvalRating * 0.3 + protestIntensity * 40 + electoralImpact * 30`
 * Rationale: Approval rating contributes (0-100 → 0-30),
 * protest intensity signals urgency (0-1 → 0-40),
 * electoral impact provides political pressure (0-1 → 0-30).
 *
 * ## Alignment Score
 *
 * Computed as: `(supportWeight - opposeWeight) / totalWeight * 100`
 * Where weight = influenceScore per actor.
 * Range: -100 (all opposition) to +100 (all support).
 */
export function analyzeActors(policy: PolicyDecision, actors: Actor[]): ActorAnalysisResult {
  if (actors.length === 0) {
    return {
      influences: [],
      alignmentScore: 0,
      supportBalance: { support: 0, oppose: 0, neutral: 0 },
      dominantChannel: "voting",
      analyzedAt: new Date(),
    };
  }

  const influences: ActorInfluence[] = actors.map((actor) => computeInfluence(actor, policy));

  const alignmentScore = computeAlignmentScore(influences);
  const supportBalance = computeSupportBalance(influences);
  const dominantChannel = computeDominantChannel(influences);

  return {
    influences,
    alignmentScore,
    supportBalance,
    dominantChannel,
    analyzedAt: new Date(),
  };
}

/**
 * Computes influence for a single actor based on type-specific formulas.
 */
function computeInfluence(actor: Actor, _policy: PolicyDecision): ActorInfluence {
  const { attributes } = actor;

  switch (attributes.type) {
    case "politician":
      return buildInfluence(actor, computePoliticianScore(attributes), "voting", determinePoliticianStance(actor));

    case "legislative":
      return buildInfluence(
        actor,
        computeLegislativeScore(attributes),
        "amendment",
        determineLegislativeStance(attributes),
      );

    case "judicial":
      return buildInfluence(
        actor,
        computeJudicialScore(attributes),
        "court_ruling",
        "neutral", // Judicial actors are presumed neutral
      );

    case "media":
      return buildInfluence(actor, computeMediaScore(attributes), "media_coverage", determineMediaStance(attributes));

    case "journalist":
      return buildInfluence(
        actor,
        computeJournalistScore(attributes),
        "investigation",
        "neutral", // Journalists default to neutral
      );

    case "researcher":
      return buildInfluence(
        actor,
        computeResearcherScore(attributes),
        "evidence_publication",
        "neutral", // Researchers default to neutral
      );

    case "public":
      return buildInfluence(
        actor,
        computePublicScore(attributes),
        determinePublicChannel(attributes),
        determinePublicStance(attributes),
      );
  }
}

// ─── Scoring Functions (Pure) ───────────────────────────────

function computePoliticianScore(attr: PoliticianAttributes): number {
  const raw = attr.votingPower * 0.5 + attr.mediaPresence * 0.2 + attr.coalitionLeverage * 30;
  return clamp(raw, 0, 100);
}

function computeLegislativeScore(attr: LegislativeAttributes): number {
  const raw = attr.legislativeCapacity * 50 + attr.amendmentPower * 30 + (attr.vetoPower ? 20 : 0);
  return clamp(raw, 0, 100);
}

function computeJudicialScore(attr: JudicialAttributes): number {
  const raw = attr.legalReviewPower * 70 + Math.min(attr.precedentSetting * 3, 30);
  return clamp(raw, 0, 100);
}

function computeMediaScore(attr: MediaAttributes): number {
  const raw =
    Math.min(attr.reach * 2, 40) + Math.min(attr.coverageVolume * 0.3, 30) + (1 - Math.abs(attr.editorialBias)) * 30;
  return clamp(raw, 0, 100);
}

function computeJournalistScore(attr: JournalistAttributes): number {
  const raw = attr.investigativeDepth * 40 + attr.publicTrust * 35 + attr.independence * 25;
  return clamp(raw, 0, 100);
}

function computeResearcherScore(attr: ResearcherAttributes): number {
  const raw = attr.methodologyRigor * 35 + Math.min(attr.citationImpact * 5, 30) + attr.policyInfluence * 35;
  return clamp(raw, 0, 100);
}

function computePublicScore(attr: PublicAttributes): number {
  const raw = attr.approvalRating * 0.3 + attr.protestIntensity * 40 + attr.electoralImpact * 30;
  return clamp(raw, 0, 100);
}

// ─── Stance Determination ───────────────────────────────────

function determinePoliticianStance(actor: Actor): ActorStance {
  // Convention: actor name containing "oposición" or "opposition" → oppose
  const name = actor.name.toLowerCase();
  if (name.includes("oposición") || name.includes("opposition")) return "oppose";
  if (name.includes("gobierno") || name.includes("governing") || name.includes("government")) return "support";
  return "neutral";
}

function determineLegislativeStance(attr: LegislativeAttributes): ActorStance {
  // Majority capacity → support, minority → oppose
  if (attr.legislativeCapacity > 0.5) return "support";
  if (attr.legislativeCapacity < 0.3) return "oppose";
  return "neutral";
}

function determineMediaStance(attr: MediaAttributes): ActorStance {
  // Strong editorial bias implies stance
  if (attr.editorialBias < -0.5) return "support"; // Left-leaning media tends to support progressive policies
  if (attr.editorialBias > 0.5) return "oppose"; // Right-leaning media tends to oppose
  return "neutral";
}

function determinePublicStance(attr: PublicAttributes): ActorStance {
  if (attr.approvalRating > 60) return "support";
  if (attr.approvalRating < 40) return "oppose";
  return "neutral";
}

function determinePublicChannel(attr: PublicAttributes): InfluenceChannel {
  if (attr.protestIntensity > 0.5) return "protest";
  if (attr.electoralImpact > 0.5) return "electoral_behavior";
  return "polling";
}

// ─── Aggregate Computations ─────────────────────────────────

function computeAlignmentScore(influences: ActorInfluence[]): number {
  let supportWeight = 0;
  let opposeWeight = 0;
  let totalWeight = 0;

  for (const inf of influences) {
    totalWeight += inf.influenceScore;
    if (inf.stance === "support") supportWeight += inf.influenceScore;
    if (inf.stance === "oppose") opposeWeight += inf.influenceScore;
  }

  if (totalWeight === 0) return 0;

  const raw = ((supportWeight - opposeWeight) / totalWeight) * 100;
  return Math.round(raw * 100) / 100;
}

function computeSupportBalance(influences: ActorInfluence[]): { support: number; oppose: number; neutral: number } {
  let support = 0;
  let oppose = 0;
  let neutral = 0;

  for (const inf of influences) {
    if (inf.stance === "support") support++;
    else if (inf.stance === "oppose") oppose++;
    else neutral++;
  }

  return { support, oppose, neutral };
}

function computeDominantChannel(influences: ActorInfluence[]): InfluenceChannel {
  const channelCounts = new Map<InfluenceChannel, number>();

  for (const inf of influences) {
    channelCounts.set(inf.influenceChannel, (channelCounts.get(inf.influenceChannel) || 0) + 1);
  }

  let dominant: InfluenceChannel = "voting";
  let maxCount = 0;

  for (const [channel, count] of channelCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = channel;
    }
  }

  return dominant;
}

// ─── Helpers ────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max) * 100) / 100;
}

function buildInfluence(actor: Actor, score: number, channel: InfluenceChannel, stance: ActorStance): ActorInfluence {
  return {
    actorId: actor.id,
    actorType: actor.type,
    influenceScore: score,
    influenceChannel: channel,
    stance,
    description: `${actor.name} (${actor.type}) exerts ${stance} influence via ${channel} with score ${score}`,
  };
}
