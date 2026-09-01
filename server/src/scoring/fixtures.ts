import type { ActivityResult, DailyInputs } from "./types";

export function scored(result: ActivityResult): Extract<ActivityResult, { status: "SCORED" }> {
  if (result.status !== "SCORED") {
    throw new Error(`expected a SCORED result, got ${result.status}`);
  }
  return result;
}

export function makeDay(overrides: Partial<DailyInputs> = {}): DailyInputs {
  return {
    date: "2026-09-01",
    weatherCode: 1,
    tempMax: 20,
    tempMin: 10,
    snowfallSumCm: 0,
    snowDepthMaxM: 0,
    rainSumMm: 0,
    precipSumMm: 0,
    precipProbMaxPct: 5,
    windMaxKmh: 10,
    gustsMaxKmh: 18,
    cloudCoverMeanPct: 20,
    marine: null,
    ...overrides,
  };
}
