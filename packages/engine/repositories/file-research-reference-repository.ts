// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { ResearchReference } from "../research/research-reference";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { ResearchReferenceRepository } from "./research-reference-repository";

const logger = createLogger("repository.research-file");

const VALID_METHODOLOGIES = new Set(["rct", "meta_analysis", "observational", "case_study", "expert_opinion"]);
const VALID_ALIGNMENTS = new Set(["supports", "challenges", "neutral"]);

/**
 * Loads research reference data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-research.json
 */
export class FileResearchReferenceRepository implements ResearchReferenceRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/research");
  }

  findByCountry(country: string): Result<ResearchReference[], DomainError> {
    const filename = `${country.toLowerCase()}-research.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading research data", { country, filePath });

    if (!fs.existsSync(filePath)) {
      return fail(new DataSourceError(filename, `File not found at ${filePath}`));
    }

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      return fail(new DataSourceError(filename, (err as Error).message));
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return fail(new DataSourceError(filename, `Invalid JSON: ${(err as Error).message}`));
    }

    return this.validateResearchData(data);
  }

  findByPolicy(policyId: string, country: string): Result<ResearchReference[], DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult;

    const refs = allResult.value.filter((r) => r.policyId === policyId);
    return ok(refs);
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Research data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-research.json"))
        .map((f) => f.replace("-research.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateResearchData(data: unknown): Result<ResearchReference[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.references)) {
      return fail(new ValidationError("references", "Must be an array"));
    }

    const refs: ResearchReference[] = [];

    for (let i = 0; i < obj.references.length; i++) {
      const result = this.validateEntry(obj.references[i], i);
      if (!result.ok) return result as unknown as Result<ResearchReference[], DomainError>;
      refs.push(result.value);
    }

    logger.info("Research data loaded", { country: obj.country, referenceCount: refs.length });

    return ok(refs);
  }

  private validateEntry(raw: unknown, index: number): Result<ResearchReference, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`references[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;
    const prefix = `references[${index}]`;

    if (typeof obj.id !== "string") return fail(new ValidationError(`${prefix}.id`, "Must be a string"));
    if (typeof obj.policyId !== "string") return fail(new ValidationError(`${prefix}.policyId`, "Must be a string"));
    if (typeof obj.title !== "string") return fail(new ValidationError(`${prefix}.title`, "Must be a string"));
    if (!Array.isArray(obj.authors)) return fail(new ValidationError(`${prefix}.authors`, "Must be an array"));
    if (typeof obj.year !== "number") return fail(new ValidationError(`${prefix}.year`, "Must be a number"));
    if (typeof obj.journal !== "string") return fail(new ValidationError(`${prefix}.journal`, "Must be a string"));
    if (typeof obj.citationCount !== "number" || obj.citationCount < 0) {
      return fail(new ValidationError(`${prefix}.citationCount`, "Must be a non-negative number"));
    }
    if (typeof obj.methodology !== "string" || !VALID_METHODOLOGIES.has(obj.methodology)) {
      return fail(new ValidationError(`${prefix}.methodology`, "Must be a valid methodology type"));
    }
    if (typeof obj.relevanceScore !== "number" || obj.relevanceScore < 0 || obj.relevanceScore > 1) {
      return fail(new ValidationError(`${prefix}.relevanceScore`, "Must be between 0 and 1"));
    }
    if (typeof obj.findings !== "string") return fail(new ValidationError(`${prefix}.findings`, "Must be a string"));
    if (typeof obj.policyAlignment !== "string" || !VALID_ALIGNMENTS.has(obj.policyAlignment)) {
      return fail(new ValidationError(`${prefix}.policyAlignment`, "Must be 'supports', 'challenges', or 'neutral'"));
    }

    return ok({
      id: obj.id,
      policyId: obj.policyId,
      title: obj.title,
      authors: (obj.authors as unknown[]).map(String),
      year: obj.year,
      journal: obj.journal,
      citationCount: obj.citationCount,
      methodology: obj.methodology,
      relevanceScore: obj.relevanceScore,
      findings: obj.findings,
      policyAlignment: obj.policyAlignment,
    } as ResearchReference);
  }
}
