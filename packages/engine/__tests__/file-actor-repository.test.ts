// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileActorRepository } from "../repositories/file-actor-repository";

const dataDir = path.resolve(__dirname, "../../../data/actors");
const repo = new FileActorRepository(dataDir);

describe("FileActorRepository", () => {
  describe("findByCountry", () => {
    it("loads actors for Spain (case-insensitive)", () => {
      const result = repo.findByCountry("spain");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThanOrEqual(3);
        for (const actor of result.value) {
          expect(actor.id).toBeTruthy();
          expect(actor.name).toBeTruthy();
          expect(actor.type).toBeTruthy();
          expect(actor.country).toBe("Spain");
        }
      }
    });

    it("loads actors for all 4 countries", () => {
      for (const country of ["spain", "france", "germany", "italy"]) {
        const result = repo.findByCountry(country);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.length).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it("returns error for unknown country", () => {
      const result = repo.findByCountry("atlantis");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DATA_SOURCE_ERROR");
        expect(result.error.message).toContain("File not found");
      }
    });

    it("each actor has correct structure", () => {
      const result = repo.findByCountry("spain");

      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const actor of result.value) {
          expect(typeof actor.id).toBe("string");
          expect(typeof actor.name).toBe("string");
          expect(typeof actor.type).toBe("string");
          expect(typeof actor.country).toBe("string");
          expect(actor.attributes).toBeTruthy();
          expect(actor.attributes.type).toBe(actor.type);
        }
      }
    });
  });

  describe("findByType", () => {
    it("filters actors by type", () => {
      const result = repo.findByType("spain", "politician");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThanOrEqual(1);
        for (const actor of result.value) {
          expect(actor.type).toBe("politician");
        }
      }
    });

    it("returns empty array for type with no actors", () => {
      const result = repo.findByType("spain", "journalist");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe("findById", () => {
    it("finds actor by ID across countries", () => {
      const result = repo.findById("governing-party-spain");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("governing-party-spain");
        expect(result.value.name).toContain("Gobierno");
      }
    });

    it("returns error for unknown ID", () => {
      const result = repo.findById("nonexistent-actor");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ACTOR_NOT_FOUND");
      }
    });
  });

  describe("listAvailableCountries", () => {
    it("lists at least 4 countries", () => {
      const result = repo.listAvailableCountries();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeGreaterThanOrEqual(4);
        expect(result.value).toContain("Spain");
        expect(result.value).toContain("France");
        expect(result.value).toContain("Germany");
        expect(result.value).toContain("Italy");
      }
    });
  });

  describe("validation", () => {
    it("returns error for non-existent data directory", () => {
      const badRepo = new FileActorRepository("/nonexistent/path");
      const result = badRepo.findByCountry("spain");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DATA_SOURCE_ERROR");
      }
    });
  });
});
