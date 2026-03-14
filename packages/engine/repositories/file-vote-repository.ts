// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import fs from "node:fs";
import path from "node:path";
import { DataSourceError, type DomainError, ValidationError } from "../shared/errors/domain-error";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";
import type { Amendment, VoteRecord } from "../votes/vote-record";
import type { VoteRepository } from "./vote-repository";

const logger = createLogger("repository.votes-file");

const VALID_RESULTS = new Set(["approved", "rejected", "amended"]);
const VALID_AMENDMENT_STATUSES = new Set(["pending", "approved", "rejected", "withdrawn"]);

/**
 * Loads parliamentary vote data from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-votes.json
 * Located in the configured data directory.
 */
export class FileVoteRepository implements VoteRepository {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, "../../../data/votes");
  }

  findByCountry(country: string): Result<VoteRecord[], DomainError> {
    const filename = `${country.toLowerCase()}-votes.json`;
    const filePath = path.join(this.dataDir, filename);

    logger.debug("Loading vote data", { country, filePath });

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

    return this.validateVoteData(data);
  }

  findByPolicy(policyId: string, country: string): Result<VoteRecord[], DomainError> {
    const allResult = this.findByCountry(country);
    if (!allResult.ok) return allResult;

    const records = allResult.value.filter((r) => r.policyId === policyId);
    return ok(records);
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, "Votes data directory not found"));
    }

    try {
      const files = fs.readdirSync(this.dataDir);
      const countries = files
        .filter((f) => f.endsWith("-votes.json"))
        .map((f) => f.replace("-votes.json", ""))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1));

      return ok(countries);
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message));
    }
  }

  private validateVoteData(data: unknown): Result<VoteRecord[], DomainError> {
    if (!data || typeof data !== "object") {
      return fail(new ValidationError("root", "Expected an object"));
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.country !== "string" || obj.country.length === 0) {
      return fail(new ValidationError("country", "Must be a non-empty string"));
    }

    if (!Array.isArray(obj.votes)) {
      return fail(new ValidationError("votes", "Must be an array"));
    }

    const records: VoteRecord[] = [];

    for (let i = 0; i < obj.votes.length; i++) {
      const result = this.validateVoteEntry(obj.votes[i], i);
      if (!result.ok) return result as unknown as Result<VoteRecord[], DomainError>;
      records.push(result.value);
    }

    logger.info("Vote data loaded", {
      country: obj.country,
      recordCount: records.length,
    });

    return ok(records);
  }

  private validateVoteEntry(raw: unknown, index: number): Result<VoteRecord, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`votes[${index}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.policyId !== "string") {
      return fail(new ValidationError(`votes[${index}].policyId`, "Must be a string"));
    }

    if (typeof obj.chamber !== "string") {
      return fail(new ValidationError(`votes[${index}].chamber`, "Must be a string"));
    }

    if (typeof obj.date !== "string") {
      return fail(new ValidationError(`votes[${index}].date`, "Must be a string"));
    }

    if (typeof obj.result !== "string" || !VALID_RESULTS.has(obj.result)) {
      return fail(new ValidationError(`votes[${index}].result`, "Must be 'approved', 'rejected', or 'amended'"));
    }

    if (typeof obj.votesFor !== "number" || obj.votesFor < 0) {
      return fail(new ValidationError(`votes[${index}].votesFor`, "Must be a non-negative number"));
    }

    if (typeof obj.votesAgainst !== "number" || obj.votesAgainst < 0) {
      return fail(new ValidationError(`votes[${index}].votesAgainst`, "Must be a non-negative number"));
    }

    if (typeof obj.abstentions !== "number" || obj.abstentions < 0) {
      return fail(new ValidationError(`votes[${index}].abstentions`, "Must be a non-negative number"));
    }

    if (typeof obj.totalSeats !== "number" || obj.totalSeats < 1) {
      return fail(new ValidationError(`votes[${index}].totalSeats`, "Must be a positive number"));
    }

    // Validate amendments
    const amendments: Amendment[] = [];
    if (Array.isArray(obj.amendments)) {
      for (let j = 0; j < obj.amendments.length; j++) {
        const amResult = this.validateAmendment(obj.amendments[j], index, j);
        if (!amResult.ok) return amResult as unknown as Result<VoteRecord, DomainError>;
        amendments.push(amResult.value);
      }
    }

    return ok({
      policyId: obj.policyId,
      chamber: obj.chamber,
      date: obj.date,
      result: obj.result as VoteRecord["result"],
      votesFor: obj.votesFor,
      votesAgainst: obj.votesAgainst,
      abstentions: obj.abstentions,
      totalSeats: obj.totalSeats,
      amendments,
    } as VoteRecord);
  }

  private validateAmendment(raw: unknown, voteIdx: number, amIdx: number): Result<Amendment, DomainError> {
    if (!raw || typeof raw !== "object") {
      return fail(new ValidationError(`votes[${voteIdx}].amendments[${amIdx}]`, "Must be an object"));
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.id !== "string") {
      return fail(new ValidationError(`votes[${voteIdx}].amendments[${amIdx}].id`, "Must be a string"));
    }

    if (typeof obj.description !== "string") {
      return fail(new ValidationError(`votes[${voteIdx}].amendments[${amIdx}].description`, "Must be a string"));
    }

    if (typeof obj.proposedBy !== "string") {
      return fail(new ValidationError(`votes[${voteIdx}].amendments[${amIdx}].proposedBy`, "Must be a string"));
    }

    if (typeof obj.status !== "string" || !VALID_AMENDMENT_STATUSES.has(obj.status)) {
      return fail(
        new ValidationError(
          `votes[${voteIdx}].amendments[${amIdx}].status`,
          "Must be 'pending', 'approved', 'rejected', or 'withdrawn'",
        ),
      );
    }

    return ok({
      id: obj.id,
      description: obj.description,
      proposedBy: obj.proposedBy,
      status: obj.status as Amendment["status"],
    } as Amendment);
  }
}
