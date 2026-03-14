// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { PolicyDecision } from "../policy/policy-decision";
import { analyzeVotes } from "../votes/vote-analysis-model";
import type { VoteRecord } from "../votes/vote-record";

const basePolicy: PolicyDecision = {
  id: "test-policy",
  title: "Test Policy",
  description: "A test policy for vote analysis",
  date: new Date("2023-01-01"),
  actors: ["gobierno"],
  objectives: ["test"],
  domain: "housing",
};

const baseVoteRecord: VoteRecord = {
  policyId: "test-policy",
  chamber: "Congreso de los Diputados",
  date: "2023-04-27",
  result: "approved",
  votesFor: 176,
  votesAgainst: 167,
  abstentions: 7,
  totalSeats: 350,
  amendments: [],
};

describe("analyzeVotes", () => {
  it("returns exactly 3 metrics", () => {
    const metrics = analyzeVotes(basePolicy, [baseVoteRecord]);

    expect(metrics).toHaveLength(3);
    expect(metrics.map((m) => m.metricName)).toEqual(["passage_probability", "amendment_risk", "coalition_stability"]);
  });

  it("computes passage_probability correctly", () => {
    const metrics = analyzeVotes(basePolicy, [baseVoteRecord]);
    const pp = metrics[0];

    // votesFor / (votesFor + votesAgainst) * 100
    // 176 / (176 + 167) * 100 = 176/343 * 100 ≈ 51.31
    expect(pp.value).toBeCloseTo(51.31, 1);
    expect(pp.policyId).toBe("test-policy");
    expect(pp.source).toBe("vote-analysis-model");
  });

  it("computes amendment_risk correctly with pending amendments", () => {
    const recordWithAmendments: VoteRecord = {
      ...baseVoteRecord,
      amendments: [
        { id: "AM-001", description: "Amendment 1", proposedBy: "PP", status: "pending" },
        { id: "AM-002", description: "Amendment 2", proposedBy: "VOX", status: "pending" },
        { id: "AM-003", description: "Amendment 3", proposedBy: "PSOE", status: "approved" },
      ],
    };

    const metrics = analyzeVotes(basePolicy, [recordWithAmendments]);
    const ar = metrics[1];

    // 2 pending × 15 = 30
    expect(ar.value).toBe(30);
  });

  it("caps amendment_risk at 100", () => {
    const manyAmendments: VoteRecord = {
      ...baseVoteRecord,
      amendments: Array.from({ length: 10 }, (_, i) => ({
        id: `AM-${i}`,
        description: `Amendment ${i}`,
        proposedBy: "PP",
        status: "pending" as const,
      })),
    };

    const metrics = analyzeVotes(basePolicy, [manyAmendments]);
    const ar = metrics[1];

    // 10 × 15 = 150, capped at 100
    expect(ar.value).toBe(100);
  });

  it("computes coalition_stability correctly", () => {
    const metrics = analyzeVotes(basePolicy, [baseVoteRecord]);
    const cs = metrics[2];

    // totalVoters = 176 + 167 + 7 = 350
    // abstentionPenalty = 7/350 * 100 = 2
    // amendmentRisk = 0 (no pending amendments)
    // stability = 100 - 2 - 0 = 98
    expect(cs.value).toBe(98);
  });

  it("coalition_stability is reduced by abstentions and amendment pressure", () => {
    const unstable: VoteRecord = {
      ...baseVoteRecord,
      votesFor: 100,
      votesAgainst: 100,
      abstentions: 100,
      amendments: [
        { id: "AM-001", description: "Amendment 1", proposedBy: "PP", status: "pending" },
        { id: "AM-002", description: "Amendment 2", proposedBy: "VOX", status: "pending" },
        { id: "AM-003", description: "Amendment 3", proposedBy: "ERC", status: "pending" },
        { id: "AM-004", description: "Amendment 4", proposedBy: "Sumar", status: "pending" },
      ],
    };

    const metrics = analyzeVotes(basePolicy, [unstable]);
    const cs = metrics[2];

    // totalVoters = 300
    // abstentionPenalty = 100/300 * 100 = 33.33
    // amendmentRisk = 4 × 15 = 60
    // stability = 100 - 33.33 - 60*0.3 = 100 - 33.33 - 18 = 48.67
    expect(cs.value).toBeCloseTo(48.67, 1);
  });

  it("aggregates across multiple vote records", () => {
    const records: VoteRecord[] = [
      { ...baseVoteRecord, votesFor: 200, votesAgainst: 100, abstentions: 50 },
      { ...baseVoteRecord, votesFor: 150, votesAgainst: 80, abstentions: 35 },
    ];

    const metrics = analyzeVotes(basePolicy, records);
    const pp = metrics[0];

    // Total for: 350, total against: 180
    // 350 / (350 + 180) * 100 = 350/530 * 100 ≈ 66.04
    expect(pp.value).toBeCloseTo(66.04, 1);
  });

  it("returns neutral defaults for empty records", () => {
    const metrics = analyzeVotes(basePolicy, []);

    expect(metrics[0].value).toBe(50); // passage_probability: neutral
    expect(metrics[1].value).toBe(0); // amendment_risk: no risk
    expect(metrics[2].value).toBe(50); // coalition_stability: neutral
  });

  it("handles unanimous approval", () => {
    const unanimous: VoteRecord = {
      ...baseVoteRecord,
      votesFor: 350,
      votesAgainst: 0,
      abstentions: 0,
    };

    const metrics = analyzeVotes(basePolicy, [unanimous]);

    expect(metrics[0].value).toBe(100); // 100% passage probability
    expect(metrics[2].value).toBe(100); // maximum stability
  });

  it("handles full rejection", () => {
    const rejected: VoteRecord = {
      ...baseVoteRecord,
      result: "rejected",
      votesFor: 0,
      votesAgainst: 340,
      abstentions: 10,
    };

    const metrics = analyzeVotes(basePolicy, [rejected]);

    expect(metrics[0].value).toBe(0); // 0% passage probability
  });

  it("includes timestamp in each metric", () => {
    const before = new Date();
    const metrics = analyzeVotes(basePolicy, [baseVoteRecord]);
    const after = new Date();

    for (const m of metrics) {
      expect(m.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(m.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
