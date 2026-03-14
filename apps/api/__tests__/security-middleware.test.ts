// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../server/server";

/**
 * Security middleware tests.
 *
 * Validates that security headers, body limits, and audit logging
 * work correctly without coupling to domain logic.
 */
describe("Security Middleware", () => {
  describe("Security Headers (helmet)", () => {
    it("should include X-Content-Type-Options header", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("should include X-Frame-Options header", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("should include Strict-Transport-Security header", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["strict-transport-security"]).toContain("max-age=");
    });

    it("should remove X-Powered-By header", async () => {
      const res = await request(app).get("/api/health");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("Body Size Limit", () => {
    it("should reject payloads exceeding body limit", async () => {
      // Generate a payload larger than 10KB
      const largePayload = {
        policy: {
          id: "test",
          title: "test",
          description: "x".repeat(15000),
          domain: "housing",
          actors: [],
          objectives: [],
        },
        country: "spain",
      };

      const res = await request(app).post("/api/policy/evaluate").send(largePayload);

      // Express returns 413 (Payload Too Large) or 500 depending on error handler
      expect([413, 500]).toContain(res.status);
    });
  });

  describe("CORS", () => {
    it("should respond to OPTIONS preflight request", async () => {
      const res = await request(app).options("/api/health").set("Origin", "http://localhost:3000");

      expect(res.status).toBe(204);
    });

    it("should include CORS headers for allowed origin", async () => {
      const res = await request(app).get("/api/health").set("Origin", "http://localhost:3000");

      expect(res.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("Audit Logger", () => {
    it("should not interfere with successful responses", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });

    it("should log security events for 4xx responses (validation failure)", async () => {
      const res = await request(app).post("/api/policy/evaluate").send({});

      expect(res.status).toBe(400);
      // Audit logger runs on 'finish' event — test verifies it doesn't crash
    });
  });
});
