import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluatePolicyUseCase } from "../application/evaluate-policy.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileEconomicContextRepository } from "../repositories/file-economic-context-repository";
import { eventBus } from "../shared/events/event-bus";

const dataDir = path.resolve(__dirname, "../../../data/sources");

describe("EvaluatePolicyUseCase", () => {
  let useCase: EvaluatePolicyUseCase;
  const housingPolicy: PolicyDecision = {
    id: "test-policy",
    title: "Test Housing Policy",
    description: "Testing use case",
    date: new Date(),
    actors: ["test"],
    objectives: ["test"],
    domain: "housing",
  };

  beforeEach(() => {
    const repo = new FileEconomicContextRepository(dataDir);
    useCase = new EvaluatePolicyUseCase(repo);
    eventBus.reset();
  });

  it("should evaluate a policy for Spain successfully", () => {
    const result = useCase.execute({ policy: housingPolicy, country: "spain" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.policy.id).toBe("test-policy");
      expect(result.value.context.country).toBe("Spain");
      expect(result.value.context.year).toBe(2023);
      expect(result.value.metrics).toHaveLength(2);
      expect(result.value.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.value.evaluatedAt).toBeTruthy();
    }
  });

  it("should evaluate a policy for France", () => {
    const result = useCase.execute({ policy: housingPolicy, country: "france" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.context.country).toBe("France");
      expect(result.value.metrics[0].value).not.toBe(0);
    }
  });

  it("should evaluate a policy for Germany", () => {
    const result = useCase.execute({ policy: housingPolicy, country: "germany" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.context.country).toBe("Germany");
    }
  });

  it("should classify metric severity correctly", () => {
    const result = useCase.execute({ policy: housingPolicy, country: "spain" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const metric of result.value.metrics) {
        expect(["low", "moderate", "high", "critical"]).toContain(metric.severity);
      }
    }
  });

  it("should return error for unknown country", () => {
    const result = useCase.execute({ policy: housingPolicy, country: "atlantis" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DATA_SOURCE_ERROR");
    }
  });

  it("should publish PolicyEvaluated event on success", () => {
    const handler = vi.fn();
    eventBus.subscribe("PolicyEvaluated", handler);

    useCase.execute({ policy: housingPolicy, country: "spain" });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0];
    expect(event.payload.policyId).toBe("test-policy");
    expect(event.payload.domain).toBe("housing");
    expect(event.payload.metricsCount).toBe(2);
  });

  it("should publish PolicyEvaluationFailed event on failure", () => {
    const handler = vi.fn();
    eventBus.subscribe("PolicyEvaluationFailed", handler);

    useCase.execute({ policy: housingPolicy, country: "atlantis" });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0];
    expect(event.payload.policyId).toBe("test-policy");
    expect(event.payload.errorCode).toBe("DATA_SOURCE_ERROR");
  });

  it("should propagate correlationId through events", () => {
    const handler = vi.fn();
    eventBus.subscribe("PolicyEvaluated", handler);

    useCase.execute({
      policy: housingPolicy,
      country: "spain",
      correlationId: "req-abc-123",
    });

    const event = handler.mock.calls[0][0];
    expect(event.correlationId).toBe("req-abc-123");
  });

  it("should return fallback metric for unsupported domain", () => {
    const transportPolicy: PolicyDecision = {
      ...housingPolicy,
      id: "transport-test",
      domain: "transport" as PolicyDecision["domain"],
    };

    const result = useCase.execute({ policy: transportPolicy, country: "spain" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metrics).toHaveLength(1);
      expect(result.value.metrics[0].metricName).toBe("generic_policy_analysis");
    }
  });
});
