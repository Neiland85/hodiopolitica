// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeMediaUseCase } from "../application/analyze-media.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileMediaCoverageRepository } from "../repositories/file-media-coverage-repository";
import type { DomainEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import { MediaEventTypes } from "../shared/events/media-events";

const dataDir = path.resolve(__dirname, "../../../data/media");
const repo = new FileMediaCoverageRepository(dataDir);
const useCase = new AnalyzeMediaUseCase(repo);

const testPolicy: PolicyDecision = {
  id: "housing-law-2023",
  title: "Ley de Vivienda",
  description: "Regulación del mercado del alquiler",
  date: new Date("2023-05-25"),
  actors: ["gobierno"],
  objectives: ["reducir coste vivienda"],
  domain: "housing",
};

describe("AnalyzeMediaUseCase", () => {
  beforeEach(() => {
    eventBus.reset();
  });

  it("successfully analyzes media for Spain housing policy", () => {
    const result = useCase.execute({ policy: testPolicy, country: "spain" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metrics).toHaveLength(3);
      expect(result.value.policy.id).toBe("housing-law-2023");
      expect(result.value.coverage.country).toBe("Spain");
      expect(result.value.coverage.sources.length).toBeGreaterThan(0);

      // Each metric should have severity classification
      for (const metric of result.value.metrics) {
        expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
      }
    }
  });

  it("returns error for unknown country", () => {
    const result = useCase.execute({ policy: testPolicy, country: "atlantis" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DATA_SOURCE_ERROR");
    }
  });

  it("returns error for unknown policy in known country", () => {
    const unknownPolicy: PolicyDecision = {
      ...testPolicy,
      id: "nonexistent-policy",
    };

    const result = useCase.execute({ policy: unknownPolicy, country: "spain" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DATA_SOURCE_ERROR");
    }
  });

  it("publishes MediaAnalysisCompleted event on success", () => {
    const handler = vi.fn();
    eventBus.subscribe(MediaEventTypes.MediaAnalysisCompleted, handler);

    useCase.execute({ policy: testPolicy, country: "spain" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.type).toBe("MediaAnalysisCompleted");
    expect(event.source).toBe("analyze-media-usecase");
    expect(event.payload).toHaveProperty("policyId", "housing-law-2023");
    expect(event.payload).toHaveProperty("mediaInfluenceScore");
    expect(event.payload).toHaveProperty("narrativeDistortionIndex");
    expect(event.payload).toHaveProperty("polarizationAmplification");
  });

  it("publishes MediaAnalysisFailed event on error", () => {
    const handler = vi.fn();
    eventBus.subscribe(MediaEventTypes.MediaAnalysisFailed, handler);

    useCase.execute({ policy: testPolicy, country: "atlantis" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.type).toBe("MediaAnalysisFailed");
    expect(event.payload).toHaveProperty("errorCode", "DATA_SOURCE_ERROR");
  });

  it("propagates correlationId in events", () => {
    const handler = vi.fn();
    eventBus.subscribe(MediaEventTypes.MediaAnalysisCompleted, handler);

    useCase.execute({
      policy: testPolicy,
      country: "spain",
      correlationId: "media-corr-456",
    });

    const event: DomainEvent = handler.mock.calls[0][0];
    expect(event.correlationId).toBe("media-corr-456");
  });
});
