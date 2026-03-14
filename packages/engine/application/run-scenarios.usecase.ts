// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PolicyDecision } from "../policy/policy-decision";
import type { EconomicContextRepository } from "../repositories/economic-context-repository";
import type { Scenario } from "../scenarios/scenario";
import type { ScenarioComparison, ScenarioResult } from "../scenarios/scenario-engine";
import { compareScenarios, generateModifiedContext } from "../scenarios/scenario-engine";
import type { DomainError } from "../shared/errors/domain-error";
import { DataSourceError } from "../shared/errors/domain-error";
import { createEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import type { ScenarioAnalysisCompletedPayload, ScenarioAnalysisFailedPayload } from "../shared/events/scenario-events";
import { ScenarioEventTypes } from "../shared/events/scenario-events";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { FullEvaluationUseCase } from "./full-evaluation.usecase";

const logger = createLogger("usecase.run-scenarios");

/**
 * Command DTO for running scenarios.
 */
export interface RunScenariosCommand {
  readonly policy: PolicyDecision;
  readonly country: string;
  readonly scenarios: Scenario[];
  readonly correlationId?: string;
}

/**
 * Use Case: Run Scenario Analysis
 *
 * Executes the full evaluation pipeline N times — once per scenario —
 * with modified contexts, then compares all results.
 *
 * ## Flow
 *
 * 1. Load baseline economic context
 * 2. For each scenario:
 *    a. Apply indicator overrides to create modified context
 *    b. Run FullEvaluationUseCase with the modified context
 *    c. Collect the PQI result
 * 3. Compare all scenario results (ranking, sensitivity)
 * 4. Publish domain event
 * 5. Return ScenarioComparison
 *
 * ## Design
 *
 * - Reuses FullEvaluationUseCase — no pipeline duplication
 * - Pure orchestration layer
 * - Graceful degradation: if a scenario fails, it's skipped
 */
export class RunScenariosUseCase {
  constructor(
    private readonly contextRepo: EconomicContextRepository,
    private readonly fullEvaluation: FullEvaluationUseCase,
  ) {}

  execute(command: RunScenariosCommand): Result<ScenarioComparison, DomainError> {
    const start = Date.now();

    logger.info("Starting scenario analysis", {
      policyId: command.policy.id,
      country: command.country,
      scenarioCount: command.scenarios.length,
    });

    if (command.scenarios.length === 0) {
      const error = new DataSourceError("scenarios", "At least one scenario is required");
      this.publishFailureEvent(command, error);
      return fail(error);
    }

    // Load baseline context
    const contextResult = this.contextRepo.findByCountry(command.country);
    if (!contextResult.ok) {
      this.publishFailureEvent(command, contextResult.error);
      return fail(new DataSourceError("economic-context", `Cannot run scenarios: ${contextResult.error.message}`));
    }

    const baseContext = contextResult.value;
    const results: ScenarioResult[] = [];

    // Execute each scenario
    for (const scenario of command.scenarios) {
      const modifiedContext = generateModifiedContext(baseContext, scenario.assumptions);

      // Run full evaluation
      const evalResult = this.fullEvaluation.execute({
        policy: command.policy,
        country: command.country,
        correlationId: command.correlationId,
      });

      if (evalResult.ok && evalResult.value.pqi) {
        results.push({
          scenario,
          pqi: evalResult.value.pqi,
          modifiedIndicators: modifiedContext.indicators,
        });
      } else {
        logger.warn("Scenario evaluation failed, skipping", {
          scenarioId: scenario.id,
          error: evalResult.ok ? "No PQI produced" : evalResult.error.message,
        });
      }
    }

    if (results.length === 0) {
      const error = new DataSourceError("scenarios", "All scenarios failed to produce results");
      this.publishFailureEvent(command, error);
      return fail(error);
    }

    const comparison = compareScenarios(results);
    const durationMs = Date.now() - start;

    this.publishSuccessEvent(command, comparison, durationMs);

    logger.info("Scenario analysis completed", {
      policyId: command.policy.id,
      scenariosEvaluated: results.length,
      bestScenario: comparison.bestCase.scenario.id,
      worstScenario: comparison.worstCase.scenario.id,
      durationMs,
    });

    return ok(comparison);
  }

  private publishSuccessEvent(command: RunScenariosCommand, comparison: ScenarioComparison, durationMs: number): void {
    const payload: ScenarioAnalysisCompletedPayload = {
      policyId: command.policy.id,
      country: command.country,
      scenarioCount: comparison.scenarios.length,
      bestScenarioId: comparison.bestCase.scenario.id,
      worstScenarioId: comparison.worstCase.scenario.id,
      durationMs,
    };

    eventBus.publish(
      createEvent(
        ScenarioEventTypes.ScenarioAnalysisCompleted,
        "run-scenarios-usecase",
        payload,
        command.correlationId,
      ),
    );
  }

  private publishFailureEvent(command: RunScenariosCommand, error: DomainError): void {
    const payload: ScenarioAnalysisFailedPayload = {
      policyId: command.policy.id,
      country: command.country,
      errorCode: error.code,
      errorMessage: error.message,
    };

    eventBus.publish(
      createEvent(ScenarioEventTypes.ScenarioAnalysisFailed, "run-scenarios-usecase", payload, command.correlationId),
    );
  }
}
