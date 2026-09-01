import { describe, expect, it } from "vitest";
import { labelFor, scoreActivity } from "./engine";
import { makeDay, scored } from "./fixtures";
import type { ActivityConfig } from "./types";

const constant = (score: number) => () => score;

describe("scoreActivity", () => {
  it("computes the weighted sum of factor curves as a 0-100 score", () => {
    const config: ActivityConfig = {
      factors: [
        { name: "temp", unit: "°C", weight: 0.6, extract: (d) => d.tempMax, curve: (x) => x / 40 },
        {
          name: "wind",
          unit: "km/h",
          weight: 0.4,
          extract: (d) => d.windMaxKmh,
          curve: constant(1),
        },
      ],
      vetoes: [],
    };
    const result = scored(scoreActivity(config, makeDay({ tempMax: 20 })));
    expect(result.score).toBe(70);
    expect(result.label).toBe("GOOD");
    expect(result.factors).toEqual([
      { name: "temp", unit: "°C", value: 20, score: 0.5, weight: 0.6 },
      { name: "wind", unit: "km/h", value: 10, score: 1, weight: 0.4 },
    ]);
  });

  it("skips factors with missing measurements and renormalizes the weights", () => {
    const config: ActivityConfig = {
      factors: [
        { name: "gone", unit: "x", weight: 0.5, extract: () => null, curve: constant(1) },
        { name: "there", unit: "x", weight: 0.5, extract: constant(1), curve: constant(0.8) },
      ],
      vetoes: [],
    };
    const result = scored(scoreActivity(config, makeDay()));
    expect(result.score).toBe(80);
    expect(result.factors[0]).toEqual({
      name: "gone",
      unit: "x",
      value: null,
      score: null,
      weight: 0.5,
    });
  });

  it("returns NOT_AVAILABLE when no factor has data", () => {
    const config: ActivityConfig = {
      factors: [{ name: "gone", unit: "x", weight: 1, extract: () => null, curve: constant(1) }],
      vetoes: [],
    };
    expect(scoreActivity(config, makeDay()).status).toBe("NOT_AVAILABLE");
  });

  it("caps the score at the lowest applicable veto and reports the reasons", () => {
    const config: ActivityConfig = {
      factors: [{ name: "f", unit: "x", weight: 1, extract: constant(1), curve: constant(1) }],
      vetoes: [
        { reason: "bad", cap: 40, applies: () => true },
        { reason: "worse", cap: 25, applies: () => true },
        { reason: "not this one", cap: 5, applies: () => false },
      ],
    };
    const result = scored(scoreActivity(config, makeDay()));
    expect(result.score).toBe(25);
    expect(result.label).toBe("POOR");
    expect(result.vetoes).toEqual(["bad", "worse"]);
  });

  it("never raises a score that is already below the veto cap", () => {
    const config: ActivityConfig = {
      factors: [{ name: "f", unit: "x", weight: 1, extract: constant(1), curve: constant(0.1) }],
      vetoes: [{ reason: "capped", cap: 40, applies: () => true }],
    };
    const result = scored(scoreActivity(config, makeDay()));
    expect(result.score).toBe(10);
    expect(result.vetoes).toEqual(["capped"]);
  });
});

describe("labelFor", () => {
  it("maps scores to bands at 80/60/40", () => {
    expect(labelFor(100)).toBe("EXCELLENT");
    expect(labelFor(80)).toBe("EXCELLENT");
    expect(labelFor(79)).toBe("GOOD");
    expect(labelFor(60)).toBe("GOOD");
    expect(labelFor(59)).toBe("FAIR");
    expect(labelFor(40)).toBe("FAIR");
    expect(labelFor(39)).toBe("POOR");
    expect(labelFor(0)).toBe("POOR");
  });
});
