// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Actor Model — public API exports.
 */

export type {
  Actor,
  ActorAttributes,
  ActorType,
  JournalistAttributes,
  JudicialAttributes,
  LegislativeAttributes,
  MediaAttributes,
  PoliticianAttributes,
  PublicAttributes,
  ResearcherAttributes,
} from "./actor";

export { VALID_ACTOR_TYPES } from "./actor";
export { analyzeActors } from "./actor-analyzer";
export type {
  ActorAnalysisResult,
  ActorInfluence,
  ActorStance,
  InfluenceChannel,
  SupportBalance,
} from "./actor-influence";
