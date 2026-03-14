// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeActorsUseCase } from "../application/analyze-actors.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileActorRepository } from "../repositories/file-actor-repository";
import { ActorEventTypes } from "../shared/events/actor-events";
import type { DomainEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";

const dataDir = path.resolve(__dirname, "../../../data/actors");
const repo = new FileActorRepository(dataDir);
const useCase = new AnalyzeActorsUseCase(repo);

const testPolicy: PolicyDecision = {
  id: "test-housing-policy",
  title: "Test Housing Policy",
  description: "A test policy for actor analysis",
  date: new Date("2023-01-01"),
  actors: ["gobierno", "parlamento"],
  objectives: ["reducir coste vivienda"],
  domain: "housing",
};

describe("AnalyzeActorsUseCase", () => {
  beforeEach(() => {
    eventBus.reset();
  });

  it("successfully analyzes actors for Spain", () => {
    const result = useCase.execute({ policy: testPolicy, country: "spain" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.influences.length).toBeGreaterThanOrEqual(3);
      expect(result.value.alignmentScore).toBeGreaterThan(-100);
      expect(result.value.alignmentScore).toBeLessThanOrEqual(100);
      expect(
        result.value.supportBalance.support + result.value.supportBalance.oppose + result.value.supportBalance.neutral,
      ).toBe(result.value.influences.length);
    }
  });

  it("successfully analyzes actors for France", () => {
    const result = useCase.execute({ policy: testPolicy, country: "france" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.influences.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("successfully analyzes actors for Germany", () => {
    const result = useCase.execute({ policy: testPolicy, country: "germany" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.influences.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("successfully analyzes actors for Italy", () => {
    const result = useCase.execute({ policy: testPolicy, country: "italy" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.influences.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("returns error for unknown country", () => {
    const result = useCase.execute({ policy: testPolicy, country: "atlantis" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DATA_SOURCE_ERROR");
    }
  });

  it("publishes ActorAnalysisCompleted event on success", () => {
    const handler = vi.fn();
    eventBus.subscribe(ActorEventTypes.ActorAnalysisCompleted, handler);

    useCase.execute({ policy: testPolicy, country: "spain" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.type).toBe("ActorAnalysisCompleted");
    expect(event.source).toBe("analyze-actors-usecase");
    expect(event.payload).toHaveProperty("policyId", "test-housing-policy");
    expect(event.payload).toHaveProperty("country", "spain");
    expect(event.payload).toHaveProperty("actorsAnalyzed");
    expect(event.payload).toHaveProperty("alignmentScore");
  });

  it("publishes ActorAnalysisFailed event on error", () => {
    const handler = vi.fn();
    eventBus.subscribe(ActorEventTypes.ActorAnalysisFailed, handler);

    useCase.execute({ policy: testPolicy, country: "atlantis" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.type).toBe("ActorAnalysisFailed");
    expect(event.payload).toHaveProperty("errorCode", "DATA_SOURCE_ERROR");
  });

  it("propagates correlationId in events", () => {
    const handler = vi.fn();
    eventBus.subscribe(ActorEventTypes.ActorAnalysisCompleted, handler);

    useCase.execute({
      policy: testPolicy,
      country: "spain",
      correlationId: "test-correlation-123",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.correlationId).toBe("test-correlation-123");
  });
});
