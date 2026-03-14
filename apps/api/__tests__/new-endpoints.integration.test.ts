// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../server/server";

describe("New API Endpoints Integration", () => {
  // ─── GET /api/actors ─────────────────────────────────────
  describe("GET /api/actors", () => {
    it("should return actors for a valid country", async () => {
      const res = await request(app).get("/api/actors?country=spain");

      expect(res.status).toBe(200);
      expect(res.body.country).toBe("spain");
      expect(res.body.actors).toBeInstanceOf(Array);
      expect(res.body.actors.length).toBeGreaterThan(0);
      for (const actor of res.body.actors) {
        expect(actor.id).toBeTruthy();
        expect(actor.name).toBeTruthy();
        expect(actor.type).toBeTruthy();
      }
    });

    it("should return 400 when country is missing", async () => {
      const res = await request(app).get("/api/actors");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_COUNTRY");
    });

    it("should return 404 for unknown country", async () => {
      const res = await request(app).get("/api/actors?country=atlantis");

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/actors/analyze ────────────────────────────
  describe("POST /api/actors/analyze", () => {
    const validBody = {
      policy: {
        id: "housing-law-2023",
        title: "Ley de Vivienda",
        description: "Testing",
        domain: "housing",
        actors: [],
        objectives: [],
      },
      country: "spain",
    };

    it("should analyze actors successfully", async () => {
      const res = await request(app).post("/api/actors/analyze").send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.influences).toBeInstanceOf(Array);
      expect(res.body.influences.length).toBeGreaterThan(0);
      expect(res.body.alignmentScore).toBeDefined();
      expect(res.body.supportBalance).toBeDefined();
      expect(res.body.dominantChannel).toBeTruthy();
      expect(res.body.analyzedAt).toBeTruthy();
    });

    it("should reject missing policy", async () => {
      const res = await request(app).post("/api/actors/analyze").send({ country: "spain" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_POLICY");
    });

    it("should reject missing country", async () => {
      const res = await request(app).post("/api/actors/analyze").send({ policy: validBody.policy });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_COUNTRY");
    });
  });

  // ─── POST /api/media/analyze ─────────────────────────────
  describe("POST /api/media/analyze", () => {
    const validBody = {
      policy: {
        id: "housing-law-2023",
        title: "Ley de Vivienda",
        description: "Testing",
        domain: "housing",
        actors: [],
        objectives: [],
      },
      country: "spain",
    };

    it("should analyze media coverage successfully", async () => {
      const res = await request(app).post("/api/media/analyze").send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.policy.id).toBe("housing-law-2023");
      expect(res.body.coverage).toBeDefined();
      expect(res.body.coverage.country).toBe("Spain");
      expect(res.body.metrics).toBeInstanceOf(Array);
      expect(res.body.metrics.length).toBeGreaterThan(0);
      expect(res.body.analyzedAt).toBeTruthy();
    });

    it("should reject missing policy", async () => {
      const res = await request(app).post("/api/media/analyze").send({ country: "spain" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_POLICY");
    });

    it("should reject missing country", async () => {
      const res = await request(app).post("/api/media/analyze").send({ policy: validBody.policy });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_COUNTRY");
    });
  });

  // ─── GET /api/evaluation/full ────────────────────────────
  describe("GET /api/evaluation/full", () => {
    it("should run full evaluation for default country (spain)", async () => {
      const res = await request(app).get("/api/evaluation/full");

      expect(res.status).toBe(200);
      expect(res.body.policy.id).toBe("housing-law-2023");
      expect(res.body.country).toBe("spain");
      expect(res.body.stageResults).toBeInstanceOf(Array);
      expect(res.body.stageResults.length).toBeGreaterThan(0);
      expect(res.body.pqi).toBeDefined();
      expect(res.body.pqi.score).toBeGreaterThanOrEqual(0);
      expect(res.body.pqi.score).toBeLessThanOrEqual(100);
      expect(["A", "B", "C", "D", "F"]).toContain(res.body.pqi.grade);
      expect(res.body.pqi.components).toBeInstanceOf(Array);
      expect(res.body.durationMs).toBeGreaterThanOrEqual(0);
      expect(res.body.evaluatedAt).toBeTruthy();
    });

    it("should run full evaluation for specific country", async () => {
      const res = await request(app).get("/api/evaluation/full?country=france");

      expect(res.status).toBe(200);
      expect(res.body.country).toBe("france");
      expect(res.body.pqi).toBeDefined();
    });

    it("should return 404 for unknown country", async () => {
      const res = await request(app).get("/api/evaluation/full?country=atlantis");

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("DATA_SOURCE_ERROR");
    });
  });

  // ─── POST /api/evaluation/full ───────────────────────────
  describe("POST /api/evaluation/full", () => {
    const validBody = {
      policy: {
        id: "test-full-1",
        title: "Full Evaluation Test",
        description: "Testing pipeline",
        domain: "housing",
        actors: [],
        objectives: [],
      },
      country: "spain",
    };

    it("should run full evaluation with all stages", async () => {
      const res = await request(app).post("/api/evaluation/full").send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.policy.id).toBe("test-full-1");
      expect(res.body.stageResults.length).toBeGreaterThan(0);
      expect(res.body.pqi).toBeDefined();
      expect(res.body.pqi.summary).toBeTruthy();
    });

    it("should run with selective stages", async () => {
      const res = await request(app)
        .post("/api/evaluation/full")
        .send({ ...validBody, stages: ["domain", "pqi"] });

      expect(res.status).toBe(200);
      const stageNames = res.body.stageResults.map((s: { stageName: string }) => s.stageName);
      expect(stageNames).toContain("domain_evaluation");
      expect(stageNames).toContain("pqi_computation");
      expect(res.body.pqi).toBeDefined();
    });

    it("should reject missing policy", async () => {
      const res = await request(app).post("/api/evaluation/full").send({ country: "spain" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_POLICY");
    });

    it("should reject invalid domain", async () => {
      const res = await request(app)
        .post("/api/evaluation/full")
        .send({ policy: { id: "x", title: "x", domain: "invalid" }, country: "spain" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_DOMAIN");
    });

    it("should reject missing country", async () => {
      const res = await request(app).post("/api/evaluation/full").send({ policy: validBody.policy });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_COUNTRY");
    });

    it("should reject invalid stages", async () => {
      const res = await request(app)
        .post("/api/evaluation/full")
        .send({ ...validBody, stages: ["domain", "invalid_stage"] });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_STAGES");
    });

    it("should return 404 for unknown country", async () => {
      const res = await request(app)
        .post("/api/evaluation/full")
        .send({ ...validBody, country: "atlantis" });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("DATA_SOURCE_ERROR");
    });
  });
});
