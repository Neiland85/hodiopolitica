// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import type { PublicReactionTimeSeries, ReactionDataPoint } from "../public-reaction/public-reaction";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { PublicReactionRepository } from "./public-reaction-repository";

const logger = createLogger("repository.public-reaction-file");

/**
 * Loads public reaction data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-public-reaction.json
 */
export class FilePublicReactionRepository implements PublicReactionRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/public-reaction");
  }

  findByCountry(country: string): Result<PublicReactionTimeSeries[], DomainError> {
    const filename = `${country.toLowerCase()}-public-reaction.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading public reaction data", { country, filePath });

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

    return this.validateReactionData(data, country);
  }

  findByPolicy(policyId: string, country: string): Result<PublicReactionTimeSeries, DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult as unknown as Result<PublicReactionTimeSeries, DomainError>;

    const series = allResult.value.find((s) => s.policyId === policyId);
    if (!series) {
      return fail(new DataSourceError("public-reaction", `No reaction data for policy "${policyId}" in ${country}`));
    }

    return ok(series);
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Public reaction data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-public-reaction.json"))
        .map((f) => f.replace("-public-reaction.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateReactionData(data: unknown, country: string): Result<PublicReactionTimeSeries[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.reactions)) {
      return fail(new ValidationError("reactions", "Must be an array"));
    }

    const series: PublicReactionTimeSeries[] = [];

    for (let i = 0; i < obj.reactions.length; i++) {
      const result = this.validateReactionEntry(obj.reactions[i], i, country);
      if (!result.ok) return result as unknown as Result<PublicReactionTimeSeries[], DomainError>;
      series.push(result.value);
    }

    logger.info("Public reaction data loaded", { country: obj.country, seriesCount: series.length });

    return ok(series);
  }

  private validateReactionEntry(
    raw: unknown,
    index: number,
    country: string,
  ): Result<PublicReactionTimeSeries, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`reactions[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;
    const prefix = `reactions[${index}]`;

    if (typeof obj.policyId !== "string") {
      return fail(new ValidationError(`${prefix}.policyId`, "Must be a string"));
    }

    if (!Array.isArray(obj.dataPoints)) {
      return fail(new ValidationError(`${prefix}.dataPoints`, "Must be an array"));
    }

    const dataPoints: ReactionDataPoint[] = [];

    for (let j = 0; j < obj.dataPoints.length; j++) {
      const dpResult = this.validateDataPoint(obj.dataPoints[j], index, j);
      if (!dpResult.ok) return dpResult as unknown as Result<PublicReactionTimeSeries, DomainError>;
      dataPoints.push(dpResult.value);
    }

    return ok({
      policyId: obj.policyId,
      country,
      dataPoints,
    } as PublicReactionTimeSeries);
  }

  private validateDataPoint(raw: unknown, reactionIdx: number, dpIdx: number): Result<ReactionDataPoint, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`reactions[${reactionIdx}].dataPoints[${dpIdx}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;
    const prefix = `reactions[${reactionIdx}].dataPoints[${dpIdx}]`;

    if (typeof obj.date !== "string") return fail(new ValidationError(`${prefix}.date`, "Must be a string"));
    if (typeof obj.approvalRating !== "number" || obj.approvalRating < 0 || obj.approvalRating > 100) {
      return fail(new ValidationError(`${prefix}.approvalRating`, "Must be between 0 and 100"));
    }
    if (typeof obj.protestIntensity !== "number" || obj.protestIntensity < 0 || obj.protestIntensity > 1) {
      return fail(new ValidationError(`${prefix}.protestIntensity`, "Must be between 0 and 1"));
    }
    if (typeof obj.mediaEngagement !== "number" || obj.mediaEngagement < 0 || obj.mediaEngagement > 1) {
      return fail(new ValidationError(`${prefix}.mediaEngagement`, "Must be between 0 and 1"));
    }
    if (typeof obj.electoralShift !== "number") {
      return fail(new ValidationError(`${prefix}.electoralShift`, "Must be a number"));
    }

    return ok({
      date: obj.date,
      approvalRating: obj.approvalRating,
      protestIntensity: obj.protestIntensity,
      mediaEngagement: obj.mediaEngagement,
      electoralShift: obj.electoralShift,
    } as ReactionDataPoint);
  }
}
