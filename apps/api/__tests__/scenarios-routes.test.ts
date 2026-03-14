// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../server/server";

// ─── Tests ───────────────────────────────────────────────────

describe("Scenario API Routes", () => {
  const validPolicy = {
    id: "housing-law-2023",
    title: "Ley de Vivienda 2023",
    description: "Spanish housing regulation",
    domain: "housing",
    actors: ["gobierno"],
    objectives: ["vivienda asequible"],
  };

  describe("POST /api/scenarios/run", () => {
    it("should execute scenarios and return comparison", async () => {
      const response = await request(app)
        .post("/api/scenarios/run")
        .send({
          policy: validPolicy,
          country: "spain",
          scenarios: [
            { id: "baseline", name: "Baseline", description: "Default", assumptions: {} },
            {
              id: "optimistic",
              name: "Optimistic",
              description: "Good times",
              assumptions: { indicatorOverrides: { inflation: 1.5 } },
            },
          ],
        })
        .expect(200);

      expect(response.body.scenarios).toHaveLength(2);
      expect(response.body.ranking).toHaveLength(2);
      expect(response.body.bestCase).toBeDefined();
      expect(response.body.worstCase).toBeDefined();
      expect(response.body.sensitivityAnalysis).toHaveLength(2);
      expect(response.body.evaluatedAt).toBeDefined();
    });

    it("should return 400 when policy is missing", async () => {
      await request(app)
        .post("/api/scenarios/run")
        .send({
          country: "spain",
          scenarios: [{ id: "s1", name: "S1", assumptions: {} }],
        })
        .expect(400);
    });

    it("should return 400 when scenarios array is empty", async () => {
      await request(app)
        .post("/api/scenarios/run")
        .send({
          policy: validPolicy,
          country: "spain",
          scenarios: [],
        })
        .expect(400);
    });

    it("should return 400 when scenarios array is missing", async () => {
      await request(app)
        .post("/api/scenarios/run")
        .send({
          policy: validPolicy,
          country: "spain",
        })
        .expect(400);
    });

    it("should return 404 for unknown country", async () => {
      const response = await request(app)
        .post("/api/scenarios/run")
        .send({
          policy: validPolicy,
          country: "atlantis",
          scenarios: [{ id: "s1", name: "S1", description: "", assumptions: {} }],
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it("should return ranked scenarios with best case first", async () => {
      const response = await request(app)
        .post("/api/scenarios/run")
        .send({
          policy: validPolicy,
          country: "spain",
          scenarios: [
            { id: "status-quo", name: "Status Quo", description: "", assumptions: {} },
            {
              id: "pessimistic",
              name: "Pessimistic",
              description: "",
              assumptions: { indicatorOverrides: { unemployment: 20 } },
            },
            {
              id: "optimistic",
              name: "Optimistic",
              description: "",
              assumptions: { indicatorOverrides: { unemployment: 5 } },
            },
          ],
        })
        .expect(200);

      // Ranked by PQI score descending
      expect(response.body.ranking).toHaveLength(3);
      expect(response.body.bestCase.pqi.score).toBeGreaterThanOrEqual(response.body.worstCase.pqi.score);
    });
  });
});
