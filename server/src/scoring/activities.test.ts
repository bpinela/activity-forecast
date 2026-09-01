import { describe, expect, it } from "vitest";
import { scoreDay } from "./activities";
import { makeDay, scored } from "./fixtures";

describe("skiing", () => {
  const powder = makeDay({
    tempMax: -4,
    tempMin: -12,
    snowDepthMaxM: 0.8,
    snowfallSumCm: 20,
    gustsMaxKmh: 15,
    cloudCoverMeanPct: 20,
  });
  const groomer = makeDay({
    tempMax: -3,
    tempMin: -10,
    snowDepthMaxM: 0.6,
    snowfallSumCm: 0,
    gustsMaxKmh: 20,
    cloudCoverMeanPct: 10,
  });
  const sunnyNoSnow = makeDay({ tempMax: 5, snowDepthMaxM: 0, snowfallSumCm: 0 });

  it("ranks powder day > groomer day > snowless day", () => {
    const p = scored(scoreDay(powder).SKIING);
    const g = scored(scoreDay(groomer).SKIING);
    const n = scored(scoreDay(sunnyNoSnow).SKIING);
    expect(p.score).toBeGreaterThan(g.score);
    expect(g.score).toBeGreaterThan(n.score);
    expect(p.score).toBeGreaterThanOrEqual(90);
  });

  it("caps a snowless day regardless of how sunny it is", () => {
    const n = scored(scoreDay(sunnyNoSnow).SKIING);
    expect(n.score).toBeLessThanOrEqual(15);
    expect(n.vetoes).toContain("No meaningful snow cover");
  });
});

describe("surfing", () => {
  it("scores a clean 2m/12s glassy day as excellent", () => {
    const day = makeDay({ marine: { waveHeightMaxM: 2, wavePeriodMaxS: 12 }, windMaxKmh: 8 });
    const s = scored(scoreDay(day).SURFING);
    expect(s.score).toBeGreaterThanOrEqual(90);
    expect(s.label).toBe("EXCELLENT");
  });

  it("treats a flat ocean as unsurfable even in perfect weather", () => {
    const day = makeDay({ marine: { waveHeightMaxM: 0.1, wavePeriodMaxS: 8 }, windMaxKmh: 5 });
    const s = scored(scoreDay(day).SURFING);
    expect(s.score).toBeLessThanOrEqual(10);
  });

  it("caps to 10 under thunderstorm risk", () => {
    const day = makeDay({
      marine: { waveHeightMaxM: 2, wavePeriodMaxS: 10 },
      weatherCode: 95,
    });
    const s = scored(scoreDay(day).SURFING);
    expect(s.score).toBeLessThanOrEqual(10);
    expect(s.vetoes.length).toBeGreaterThan(0);
  });

  it("caps hazardous wave sizes", () => {
    const day = makeDay({ marine: { waveHeightMaxM: 7, wavePeriodMaxS: 15 }, windMaxKmh: 8 });
    const s = scored(scoreDay(day).SURFING);
    expect(s.score).toBeLessThanOrEqual(20);
  });

  it("is NOT_AVAILABLE without marine data", () => {
    expect(scoreDay(makeDay({ marine: null })).SURFING.status).toBe("NOT_AVAILABLE");
    expect(
      scoreDay(makeDay({ marine: { waveHeightMaxM: null, wavePeriodMaxS: null } })).SURFING.status,
    ).toBe("NOT_AVAILABLE");
  });
});

describe("outdoor sightseeing", () => {
  it("scores a mild dry clear day as excellent", () => {
    const s = scored(scoreDay(makeDay({ tempMax: 21 })).OUTDOOR_SIGHTSEEING);
    expect(s.score).toBeGreaterThanOrEqual(90);
  });

  it("caps a thunderstorm day", () => {
    const s = scored(scoreDay(makeDay({ weatherCode: 95 })).OUTDOOR_SIGHTSEEING);
    expect(s.score).toBeLessThanOrEqual(15);
  });

  it("caps extreme heat", () => {
    const s = scored(scoreDay(makeDay({ tempMax: 41 })).OUTDOOR_SIGHTSEEING);
    expect(s.score).toBeLessThanOrEqual(30);
  });

  it("keeps a grey-but-dry day decent", () => {
    const s = scored(
      scoreDay(makeDay({ cloudCoverMeanPct: 100, tempMax: 18 })).OUTDOOR_SIGHTSEEING,
    );
    expect(s.score).toBeGreaterThanOrEqual(55);
    expect(s.score).toBeLessThan(90);
  });
});

describe("indoor sightseeing", () => {
  it("is the complement of outdoor comfort, floored at 50", () => {
    const perfectOutside = scoreDay(makeDay({ tempMax: 21 }));
    expect(scored(perfectOutside.INDOOR_SIGHTSEEING).score).toBe(50);

    const storm = scoreDay(makeDay({ weatherCode: 95 }));
    expect(scored(storm.INDOOR_SIGHTSEEING).score).toBeGreaterThanOrEqual(90);
    expect(scored(storm.INDOOR_SIGHTSEEING).label).toBe("EXCELLENT");
  });

  it("explains itself through a single complement factor", () => {
    const result = scored(scoreDay(makeDay()).INDOOR_SIGHTSEEING);
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0]?.name).toMatch(/outdoor/i);
  });
});
