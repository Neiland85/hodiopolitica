import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../server/server";

describe("API Integration", () => {
  // ─── Health ────────────────────────────────────────────────
  describe("GET /api/health", () => {
    it("should return ok status with checks", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.version).toBe("1.0.0");
      expect(res.body.checks.dataSource.status).toBe("ok");
    });
  });

  // ─── Countries ─────────────────────────────────────────────
  describe("GET /api/countries", () => {
    it("should return list of countries", async () => {
      const res = await request(app).get("/api/countries");

      expect(res.status).toBe(200);
      expect(res.body.countries).toBeInstanceOf(Array);
      expect(res.body.countries.length).toBeGreaterThanOrEqual(4);
      expect(res.body.countries).toContain("Spain");
    });
  });

  // ─── GET Evaluate ──────────────────────────────────────────
  describe("GET /api/policy/evaluate", () => {
    it("should evaluate default country (spain)", async () => {
      const res = await request(app).get("/api/policy/evaluate");

      expect(res.status).toBe(200);
      expect(res.body.context.country).toBe("Spain");
      expect(res.body.metrics).toHaveLength(2);
      expect(res.body.evaluatedAt).toBeTruthy();
    });

    it("should evaluate a specific country", async () => {
      const res = await request(app).get("/api/policy/evaluate?country=france");

      expect(res.status).toBe(200);
      expect(res.body.context.country).toBe("France");
    });

    it("should return 404 for unknown country", async () => {
      const res = await request(app).get("/api/policy/evaluate?country=atlantis");

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("DATA_SOURCE_ERROR");
    });
  });

  // ─── POST Evaluate ─────────────────────────────────────────
  describe("POST /api/policy/evaluate", () => {
    const validBody = {
      policy: {
        id: "test-1",
        title: "Integration Test",
        description: "Testing",
        domain: "housing",
        actors: [],
        objectives: [],
      },
      country: "spain",
    };

    it("should evaluate a valid policy", async () => {
      const res = await request(app).post("/api/policy/evaluate").send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.policy.id).toBe("test-1");
      expect(res.body.metrics.length).toBeGreaterThan(0);
      for (const m of res.body.metrics) {
        expect(["low", "moderate", "high", "critical"]).toContain(m.severity);
      }
    });

    it("should reject missing policy", async () => {
      const res = await request(app).post("/api/policy/evaluate").send({ country: "spain" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_POLICY");
    });

    it("should reject invalid domain", async () => {
      const res = await request(app)
        .post("/api/policy/evaluate")
        .send({ policy: { id: "x", title: "x", domain: "invalid" } });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_DOMAIN");
    });
  });

  // ─── POST Compare ──────────────────────────────────────────
  describe("POST /api/policy/compare", () => {
    const validBody = {
      policy: {
        id: "cmp-1",
        title: "Compare Test",
        description: "",
        domain: "housing",
        actors: [],
        objectives: [],
      },
      countries: ["spain", "france", "germany"],
    };

    it("should compare multiple countries", async () => {
      const res = await request(app).post("/api/policy/compare").send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.comparisons).toHaveLength(3);
      expect(res.body.summary.countriesAnalyzed).toBe(3);
      expect(res.body.summary.bestPerforming).toBeTruthy();
    });

    it("should reject fewer than 2 countries", async () => {
      const res = await request(app)
        .post("/api/policy/compare")
        .send({ ...validBody, countries: ["spain"] });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_COUNTRIES");
    });

    it("should reject missing policy", async () => {
      const res = await request(app)
        .post("/api/policy/compare")
        .send({ countries: ["spain", "france"] });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("MISSING_POLICY");
    });

    it("should reject more than 10 countries", async () => {
      const countries = Array.from({ length: 11 }, (_, i) => `country-${i}`);
      const res = await request(app)
        .post("/api/policy/compare")
        .send({ ...validBody, countries });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("TOO_MANY_COUNTRIES");
    });
  });
});
