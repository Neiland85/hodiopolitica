// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EconomicIndicators } from "../context/policy-context";

/**
 * Override for a single actor's stance.
 */
export interface ActorOverride {
  /** Actor ID to modify */
  readonly actorId: string;
  /** New stance: "support" | "oppose" | "neutral" */
  readonly stance: "support" | "oppose" | "neutral";
}

/**
 * Assumptions that define a scenario variation.
 *
 * All fields are optional — only provided overrides are applied.
 */
export interface ScenarioAssumptions {
  /** Override specific economic indicators */
  readonly indicatorOverrides?: Partial<EconomicIndicators>;
  /** Override actor stances */
  readonly actorOverrides?: ActorOverride[];
  /** Shift public sentiment by this percentage (-100 to 100) */
  readonly sentimentShift?: number;
}

/**
 * A named scenario — a "what-if" configuration.
 */
export interface Scenario {
  /** Unique identifier (kebab-case) */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Description of what this scenario represents */
  readonly description: string;
  /** Assumptions to apply when running this scenario */
  readonly assumptions: ScenarioAssumptions;
}
