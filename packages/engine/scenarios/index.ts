// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

export type {
  ActorOverride,
  Scenario,
  ScenarioAssumptions,
} from "./scenario";
export type {
  ScenarioComparison,
  ScenarioResult,
  SensitivityEntry,
} from "./scenario-engine";
export { compareScenarios, generateModifiedContext } from "./scenario-engine";
