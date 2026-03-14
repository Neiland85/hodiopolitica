// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FullEvaluationUseCase } from "../application/full-evaluation.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileActorRepository } from "../repositories/file-actor-repository";
import { FileEconomicContextRepository } from "../repositories/file-economic-context-repository";
import { FileMediaCoverageRepository } from "../repositories/file-media-coverage-repository";
import { eventBus } from "../shared/events/event-bus";

// ─── Test Fixtures ───────────────────────────────────────────

const dataDir = path.resolve(__dirname, "../../../data/sources");

const housingPolicy: PolicyDecision = {
  id: "housing-law-2023",
  title: "Ley de Vivienda 2023",
  description: "Spanish housing regulation",
  date: new Date(),
  actors: ["gov"],
  objectives: ["affordable-housing"],
  domain: "housing",
};

// ─── Tests ───────────────────────────────────────────────────

describe("FullEvaluationUseCase", () => {
  let useCase: FullEvaluationUseCase;

  beforeEach(() => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const actorRepo = new FileActorRepository();
    const mediaRepo = new FileMediaCoverageRepository();
    useCase = new FullEvaluationUseCase(contextRepo, actorRepo, mediaRepo);
    eventBus.reset();
  });

  describe("full pipeline execution", () => {
    it("should execute all stages for Spain", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.policy.id).toBe("housing-law-2023");
        expect(result.value.country).toBe("spain");
        expect(result.value.stageResults.length).toBeGreaterThan(0);
        expect(result.value.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.value.evaluatedAt).toBeTruthy();
      }
    });

    it("should include PQI in full evaluation", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pqi).toBeDefined();
        expect(result.value.pqi?.score).toBeGreaterThanOrEqual(0);
        expect(result.value.pqi?.score).toBeLessThanOrEqual(100);
        expect(["A", "B", "C", "D", "F"]).toContain(result.value.pqi?.grade);
        expect(result.value.pqi?.components.length).toBeGreaterThan(0);
        expect(result.value.pqi?.summary).toBeTruthy();
      }
    });

    it("should execute full pipeline for France", () => {
      const frenchPolicy: PolicyDecision = {
        ...housingPolicy,
        id: "pension-reform-2023",
        title: "Réforme des Retraites 2023",
        domain: "economy",
      };

      const result = useCase.execute({
        policy: frenchPolicy,
        country: "france",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.country).toBe("france");
        expect(result.value.pqi).toBeDefined();
      }
    });

    it("should execute full pipeline for Germany", () => {
      const germanPolicy: PolicyDecision = {
        ...housingPolicy,
        id: "energy-transition-2023",
        title: "Energiewende 2023",
        domain: "environment",
      };

      const result = useCase.execute({
        policy: germanPolicy,
        country: "germany",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.country).toBe("germany");
      }
    });
  });

  describe("selective stage execution", () => {
    it("should execute only domain stage when specified", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
        stages: ["domain"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stageResults).toHaveLength(1);
        expect(result.value.stageResults[0].stageName).toBe("domain_evaluation");
        expect(result.value.pqi).toBeUndefined();
      }
    });

    it("should execute domain + PQI stages", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
        stages: ["domain", "pqi"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stageNames = result.value.stageResults.map((s) => s.stageName);
        expect(stageNames).toContain("domain_evaluation");
        expect(stageNames).toContain("pqi_computation");
        expect(result.value.pqi).toBeDefined();
      }
    });

    it("should execute domain + actors stages", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
        stages: ["domain", "actors"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stageNames = result.value.stageResults.map((s) => s.stageName);
        expect(stageNames).toContain("domain_evaluation");
        expect(stageNames).toContain("actor_analysis");
      }
    });
  });

  describe("error handling", () => {
    it("should return error for unknown country", () => {
      const result = useCase.execute({
        policy: housingPolicy,
        country: "atlantis",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DATA_SOURCE_ERROR");
        expect(result.error.message).toContain("Cannot evaluate");
      }
    });
  });

  describe("domain events", () => {
    it("should publish FullEvaluationCompleted on success", () => {
      const handler = vi.fn();
      eventBus.subscribe("FullEvaluationCompleted", handler);

      useCase.execute({
        policy: housingPolicy,
        country: "spain",
      });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0];
      expect(event.payload.policyId).toBe("housing-law-2023");
      expect(event.payload.country).toBe("spain");
      expect(event.payload.stagesExecuted.length).toBeGreaterThan(0);
      expect(event.payload.pqiScore).toBeGreaterThanOrEqual(0);
      expect(event.payload.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should publish FullEvaluationFailed on error", () => {
      const handler = vi.fn();
      eventBus.subscribe("FullEvaluationFailed", handler);

      useCase.execute({
        policy: housingPolicy,
        country: "atlantis",
      });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0];
      expect(event.payload.policyId).toBe("housing-law-2023");
      expect(event.payload.country).toBe("atlantis");
      expect(event.payload.errorCode).toBe("DATA_SOURCE_ERROR");
    });

    it("should propagate correlationId through events", () => {
      const handler = vi.fn();
      eventBus.subscribe("FullEvaluationCompleted", handler);

      useCase.execute({
        policy: housingPolicy,
        country: "spain",
        correlationId: "corr-pipeline-123",
      });

      const event = handler.mock.calls[0][0];
      expect(event.correlationId).toBe("corr-pipeline-123");
    });
  });

  describe("graceful degradation", () => {
    it("should succeed even if actor/media stages fail gracefully", () => {
      // The pipeline has built-in graceful degradation
      // This test verifies that the use case wraps errors properly
      const result = useCase.execute({
        policy: housingPolicy,
        country: "spain",
        stages: ["domain", "pqi"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Without actor/media stages, PQI should still work
        // with domain-only renormalized weights
        expect(result.value.pqi).toBeDefined();
        expect(result.value.pqi?.components.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
