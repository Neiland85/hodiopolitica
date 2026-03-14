// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { MediaCoverage, SentimentDistribution } from "../media/media-coverage";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { MediaCoverageRepository } from "./media-coverage-repository";

const logger = createLogger("repository.media-file");

/**
 * Loads media coverage data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-media.json
 * Located in the configured data directory.
 */
export class FileMediaCoverageRepository implements MediaCoverageRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/media");
  }

  findByCountry(country: string): Result<MediaCoverage[], DomainError> {
    const filename = `${country.toLowerCase()}-media.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading media coverage data", { country, filePath });

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

    return this.validateMediaData(data);
  }

  findByPolicy(policyId: string, country: string): Result<MediaCoverage, DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult as unknown as Result<MediaCoverage, DomainError>;

    const coverage = allResult.value.find((c) => c.policyId === policyId);
    if (!coverage) {
      return fail(new DataSourceError("media-coverage", `No coverage found for policy "${policyId}" in ${country}`));
    }

    return ok(coverage);
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Media data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-media.json"))
        .map((f) => f.replace("-media.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateMediaData(data: unknown): Result<MediaCoverage[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.coverage)) {
      return fail(new ValidationError("coverage", "Must be an array"));
    }

    const coverages: MediaCoverage[] = [];

    for (let i = 0; i < obj.coverage.length; i++) {
      const result = this.validateCoverageEntry(obj.coverage[i], i, obj.country);
      if (!result.ok) return result as unknown as Result<MediaCoverage[], DomainError>;
      coverages.push(result.value);
    }

    logger.info("Media coverage data loaded", {
      country: obj.country,
      coverageCount: coverages.length,
    });

    return ok(coverages);
  }

  private validateCoverageEntry(raw: unknown, index: number, country: string): Result<MediaCoverage, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`coverage[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.policyId !== "string") {
      return fail(new ValidationError(`coverage[${index}].policyId`, "Must be a string"));
    }

    if (typeof obj.mentionsPerDay !== "number" || obj.mentionsPerDay < 0) {
      return fail(new ValidationError(`coverage[${index}].mentionsPerDay`, "Must be a non-negative number"));
    }

    if (typeof obj.audienceReach !== "number" || obj.audienceReach < 0) {
      return fail(new ValidationError(`coverage[${index}].audienceReach`, "Must be a non-negative number"));
    }

    if (typeof obj.engagementRate !== "number" || obj.engagementRate < 0 || obj.engagementRate > 1) {
      return fail(new ValidationError(`coverage[${index}].engagementRate`, "Must be between 0 and 1"));
    }

    // Validate sentiment
    if (!obj.sentiment || typeof obj.sentiment !== "object") {
      return fail(new ValidationError(`coverage[${index}].sentiment`, "Must be an object"));
    }

    const sent = obj.sentiment as Record<string, unknown>;
    for (const key of ["positive", "negative", "neutral"]) {
      if (typeof sent[key] !== "number" || (sent[key] as number) < 0 || (sent[key] as number) > 1) {
        return fail(new ValidationError(`coverage[${index}].sentiment.${key}`, "Must be between 0 and 1"));
      }
    }

    // Validate period
    if (!obj.period || typeof obj.period !== "object") {
      return fail(new ValidationError(`coverage[${index}].period`, "Must be an object with startDate and endDate"));
    }

    const period = obj.period as Record<string, unknown>;
    if (typeof period.startDate !== "string" || typeof period.endDate !== "string") {
      return fail(new ValidationError(`coverage[${index}].period`, "startDate and endDate must be strings"));
    }

    return ok({
      policyId: obj.policyId,
      country,
      period: { startDate: period.startDate, endDate: period.endDate },
      mentionsPerDay: obj.mentionsPerDay,
      sentiment: obj.sentiment as SentimentDistribution,
      audienceReach: obj.audienceReach,
      engagementRate: obj.engagementRate,
      sources: Array.isArray(obj.sources) ? obj.sources.map(String) : [],
    } as MediaCoverage);
  }
}
