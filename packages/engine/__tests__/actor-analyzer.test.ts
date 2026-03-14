// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { Actor } from "../actors/actor";
import { analyzeActors } from "../actors/actor-analyzer";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-housing-policy",
  title: "Test Housing Policy",
  description: "A test policy for actor analysis",
  date: new Date("2023-01-01"),
  actors: ["gobierno", "parlamento"],
  objectives: ["reducir coste vivienda"],
  domain: "housing",
};

const politicianGov: Actor = {
  id: "governing-party",
  name: "Gobierno de España",
  type: "politician",
  country: "Spain",
  attributes: {
    type: "politician",
    votingPower: 35.7,
    mediaPresence: 85,
    coalitionLeverage: 0.6,
  },
};

const politicianOpp: Actor = {
  id: "opposition-party",
  name: "Oposición principal",
  type: "politician",
  country: "Spain",
  attributes: {
    type: "politician",
    votingPower: 33.1,
    mediaPresence: 72,
    coalitionLeverage: 0.3,
  },
};

const legislativeActor: Actor = {
  id: "congress",
  name: "Congreso de los Diputados",
  type: "legislative",
  country: "Spain",
  attributes: {
    type: "legislative",
    legislativeCapacity: 0.52,
    amendmentPower: 0.45,
    vetoPower: false,
  },
};

const judicialActor: Actor = {
  id: "tribunal-constitucional",
  name: "Tribunal Constitucional",
  type: "judicial",
  country: "Spain",
  attributes: {
    type: "judicial",
    legalReviewPower: 0.85,
    precedentSetting: 7,
  },
};

const publicActor: Actor = {
  id: "public-opinion",
  name: "Opinión Pública",
  type: "public",
  country: "Spain",
  attributes: {
    type: "public",
    approvalRating: 42,
    protestIntensity: 0.35,
    electoralImpact: 0.7,
  },
};

const mediaActor: Actor = {
  id: "national-media",
  name: "Medios nacionales",
  type: "media",
  country: "Spain",
  attributes: {
    type: "media",
    reach: 15,
    editorialBias: -0.2,
    coverageVolume: 45,
  },
};

const journalistActor: Actor = {
  id: "investigative-journalist",
  name: "Periodista investigativo",
  type: "journalist",
  country: "Spain",
  attributes: {
    type: "journalist",
    investigativeDepth: 0.8,
    publicTrust: 0.7,
    independence: 0.9,
  },
};

const researcherActor: Actor = {
  id: "think-tank",
  name: "Instituto de Estudios Fiscales",
  type: "researcher",
  country: "Spain",
  attributes: {
    type: "researcher",
    methodologyRigor: 0.85,
    citationImpact: 4.2,
    policyInfluence: 0.6,
  },
};

describe("analyzeActors", () => {
  it("returns empty result for empty actors array", () => {
    const result = analyzeActors(basePolicy, []);

    expect(result.influences).toHaveLength(0);
    expect(result.alignmentScore).toBe(0);
    expect(result.supportBalance).toEqual({ support: 0, oppose: 0, neutral: 0 });
  });

  it("computes politician influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [politicianGov]);

    expect(result.influences).toHaveLength(1);
    const influence = result.influences[0];
    expect(influence.actorId).toBe("governing-party");
    expect(influence.actorType).toBe("politician");
    // votingPower*0.5 + mediaPresence*0.2 + coalitionLeverage*30 = 35.7*0.5 + 85*0.2 + 0.6*30 = 17.85 + 17 + 18 = 52.85
    expect(influence.influenceScore).toBe(52.85);
    expect(influence.influenceChannel).toBe("voting");
    expect(influence.stance).toBe("support"); // "Gobierno" in name
  });

  it("determines opposition politician stance correctly", () => {
    const result = analyzeActors(basePolicy, [politicianOpp]);

    expect(result.influences[0].stance).toBe("oppose"); // "Oposición" in name
  });

  it("computes legislative influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [legislativeActor]);

    const influence = result.influences[0];
    // legislativeCapacity*50 + amendmentPower*30 + vetoPower(0) = 0.52*50 + 0.45*30 + 0 = 26 + 13.5 + 0 = 39.5
    expect(influence.influenceScore).toBe(39.5);
    expect(influence.influenceChannel).toBe("amendment");
    expect(influence.stance).toBe("support"); // capacity > 0.5
  });

  it("computes judicial influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [judicialActor]);

    const influence = result.influences[0];
    // legalReviewPower*70 + min(precedentSetting*3, 30) = 0.85*70 + min(21, 30) = 59.5 + 21 = 80.5
    expect(influence.influenceScore).toBe(80.5);
    expect(influence.influenceChannel).toBe("court_ruling");
    expect(influence.stance).toBe("neutral"); // Judicial actors always neutral
  });

  it("computes public influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [publicActor]);

    const influence = result.influences[0];
    // approvalRating*0.3 + protestIntensity*40 + electoralImpact*30 = 42*0.3 + 0.35*40 + 0.7*30 = 12.6 + 14 + 21 = 47.6
    expect(influence.influenceScore).toBe(47.6);
    expect(influence.stance).toBe("neutral"); // approvalRating 42 is between 40-60 → neutral
  });

  it("computes media influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [mediaActor]);

    const influence = result.influences[0];
    // min(reach*2, 40) + min(coverageVolume*0.3, 30) + (1-|editorialBias|)*30 = min(30, 40) + min(13.5, 30) + (1-0.2)*30 = 30 + 13.5 + 24 = 67.5
    expect(influence.influenceScore).toBe(67.5);
    expect(influence.influenceChannel).toBe("media_coverage");
    expect(influence.stance).toBe("neutral"); // editorialBias = -0.2, not < -0.5
  });

  it("computes journalist influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [journalistActor]);

    const influence = result.influences[0];
    // investigativeDepth*40 + publicTrust*35 + independence*25 = 0.8*40 + 0.7*35 + 0.9*25 = 32 + 24.5 + 22.5 = 79
    expect(influence.influenceScore).toBe(79);
    expect(influence.influenceChannel).toBe("investigation");
  });

  it("computes researcher influence scores correctly", () => {
    const result = analyzeActors(basePolicy, [researcherActor]);

    const influence = result.influences[0];
    // methodologyRigor*35 + min(citationImpact*5, 30) + policyInfluence*35 = 0.85*35 + min(21, 30) + 0.6*35 = 29.75 + 21 + 21 = 71.75
    expect(influence.influenceScore).toBe(71.75);
    expect(influence.influenceChannel).toBe("evidence_publication");
  });

  it("computes alignment score with mixed stances", () => {
    const result = analyzeActors(basePolicy, [politicianGov, politicianOpp, judicialActor]);

    // gov=support (52.85), opp=oppose (varies), judicial=neutral (80.5)
    expect(result.supportBalance.support).toBe(1);
    expect(result.supportBalance.oppose).toBe(1);
    expect(result.supportBalance.neutral).toBe(1);
    // alignmentScore should reflect support-oppose balance weighted by influence
    expect(result.alignmentScore).toBeGreaterThan(-100);
    expect(result.alignmentScore).toBeLessThan(100);
  });

  it("computes fully supporting alignment as positive", () => {
    const result = analyzeActors(basePolicy, [politicianGov]);

    expect(result.alignmentScore).toBe(100); // Only supporter
  });

  it("computes fully opposing alignment as negative", () => {
    const result = analyzeActors(basePolicy, [politicianOpp]);

    expect(result.alignmentScore).toBe(-100); // Only opponent
  });

  it("computes dominant channel correctly", () => {
    const result = analyzeActors(basePolicy, [politicianGov, politicianOpp, legislativeActor]);

    // Two politicians (voting) + one legislative (amendment) → voting dominates
    expect(result.dominantChannel).toBe("voting");
  });

  it("includes analyzedAt timestamp", () => {
    const before = new Date();
    const result = analyzeActors(basePolicy, [politicianGov]);
    const after = new Date();

    expect(result.analyzedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("clamps scores to 0-100 range", () => {
    const extremeActor: Actor = {
      id: "extreme",
      name: "Extreme Actor",
      type: "politician",
      country: "Test",
      attributes: {
        type: "politician",
        votingPower: 200,
        mediaPresence: 500,
        coalitionLeverage: 2,
      },
    };

    const result = analyzeActors(basePolicy, [extremeActor]);
    expect(result.influences[0].influenceScore).toBeLessThanOrEqual(100);
    expect(result.influences[0].influenceScore).toBeGreaterThanOrEqual(0);
  });

  it("handles all actor types in a single analysis", () => {
    const allActors = [
      politicianGov,
      politicianOpp,
      legislativeActor,
      judicialActor,
      publicActor,
      mediaActor,
      journalistActor,
      researcherActor,
    ];

    const result = analyzeActors(basePolicy, allActors);

    expect(result.influences).toHaveLength(8);
    expect(result.supportBalance.support + result.supportBalance.oppose + result.supportBalance.neutral).toBe(8);
  });

  it("determines public stance based on approval rating thresholds", () => {
    const highApproval: Actor = {
      ...publicActor,
      id: "high-approval",
      attributes: {
        type: "public",
        approvalRating: 75,
        protestIntensity: 0.1,
        electoralImpact: 0.5,
      },
    };

    const result = analyzeActors(basePolicy, [highApproval]);
    expect(result.influences[0].stance).toBe("support"); // > 60
  });

  it("assigns protest channel when protest intensity is high", () => {
    const protestingPublic: Actor = {
      ...publicActor,
      id: "protesting",
      attributes: {
        type: "public",
        approvalRating: 30,
        protestIntensity: 0.8,
        electoralImpact: 0.3,
      },
    };

    const result = analyzeActors(basePolicy, [protestingPublic]);
    expect(result.influences[0].influenceChannel).toBe("protest");
  });

  it("computes veto power bonus for legislative actors", () => {
    const withVeto: Actor = {
      ...legislativeActor,
      id: "senate-veto",
      name: "Senate with Veto",
      attributes: {
        type: "legislative",
        legislativeCapacity: 0.52,
        amendmentPower: 0.45,
        vetoPower: true,
      },
    };

    const withoutVeto = analyzeActors(basePolicy, [legislativeActor]);
    const withVetoResult = analyzeActors(basePolicy, [withVeto]);

    expect(withVetoResult.influences[0].influenceScore).toBe(withoutVeto.influences[0].influenceScore + 20);
  });
});
