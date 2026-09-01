import { trapezoid } from "./curves";
import { labelFor, scoreActivity } from "./engine";
import type { ActivityConfig, ActivityResult, DailyInputs } from "./types";

export type ActivityKey = "SKIING" | "SURFING" | "OUTDOOR_SIGHTSEEING" | "INDOOR_SIGHTSEEING";

const THUNDERSTORM = (d: DailyInputs) => (d.weatherCode ?? 0) >= 95;

const SKIING: ActivityConfig = {
  factors: [
    {
      name: "Snow base",
      unit: "m",
      weight: 0.25,
      extract: (d) => d.snowDepthMaxM,
      curve: (x) => trapezoid(x, 0.02, 0.3, Infinity, Infinity),
    },
    {
      name: "Fresh snow",
      unit: "cm",
      weight: 0.15,
      extract: (d) => d.snowfallSumCm,
      curve: (x) => trapezoid(x, 0, 3, 25, 60),
    },
    {
      name: "Temperature",
      unit: "°C",
      weight: 0.2,
      extract: (d) => d.tempMax,
      curve: (x) => trapezoid(x, -18, -8, -1, 7),
    },
    {
      name: "Wind gusts",
      unit: "km/h",
      weight: 0.2,
      extract: (d) => d.gustsMaxKmh,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 25, 65),
    },
    {
      name: "Clear sky",
      unit: "%",
      weight: 0.1,
      extract: (d) => d.cloudCoverMeanPct,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 40, 100),
    },
    {
      name: "No rain",
      unit: "mm",
      weight: 0.1,
      extract: (d) => d.rainSumMm,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 0, 8),
    },
  ],
  vetoes: [
    {
      reason: "No meaningful snow cover",
      cap: 15,
      applies: (d) => (d.snowDepthMaxM ?? 0) < 0.05 && (d.snowfallSumCm ?? 0) < 5,
    },
    { reason: "Thunderstorm risk", cap: 20, applies: THUNDERSTORM },
    {
      reason: "Freezing rain",
      cap: 30,
      applies: (d) => d.weatherCode === 66 || d.weatherCode === 67,
    },
    {
      reason: "Lifts likely closed by wind",
      cap: 25,
      applies: (d) => (d.gustsMaxKmh ?? 0) >= 80,
    },
  ],
};

// WMO weather codes: 0-1 clear, 2-3 clouds, 45-48 fog, 51-57 drizzle,
// 61-67 rain (66-67 freezing), 71-77 snow, 80-86 showers, 95-99 thunderstorm
function weatherComfort(code: number): number {
  if (code >= 95) return 0;
  if (code >= 85) return 0.4;
  if (code >= 80) return 0.5;
  if (code >= 71) return 0.4;
  if (code >= 66) return 0.3;
  if (code >= 61) return 0.5;
  if (code >= 51) return 0.6;
  if (code >= 45) return 0.7;
  if (code <= 1) return 1;
  return 0.9;
}

const SURFING: ActivityConfig = {
  factors: [
    {
      name: "Wave height",
      unit: "m",
      weight: 0.35,
      extract: (d) => d.marine?.waveHeightMaxM ?? null,
      curve: (x) => trapezoid(x, 0.3, 1, 2.5, 5),
    },
    {
      name: "Wave period",
      unit: "s",
      weight: 0.25,
      extract: (d) => d.marine?.wavePeriodMaxS ?? null,
      curve: (x) => trapezoid(x, 5, 9, Infinity, Infinity),
    },
    {
      name: "Low wind",
      unit: "km/h",
      weight: 0.25,
      extract: (d) => d.windMaxKmh,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 12, 40),
    },
    {
      name: "Weather",
      unit: "WMO code",
      weight: 0.15,
      extract: (d) => d.weatherCode,
      curve: weatherComfort,
    },
  ],
  vetoes: [
    // essential factor: without rideable waves, clean conditions must not add up to "Fair"
    {
      reason: "Flat — waves too small to surf",
      cap: 10,
      applies: (d) => (d.marine?.waveHeightMaxM ?? Infinity) < 0.3,
    },
    { reason: "Lightning risk — stay out of the water", cap: 10, applies: THUNDERSTORM },
    {
      reason: "Hazardous wave size",
      cap: 20,
      applies: (d) => (d.marine?.waveHeightMaxM ?? 0) > 6,
    },
  ],
};

const OUTDOOR: ActivityConfig = {
  factors: [
    {
      name: "Dry day",
      unit: "mm",
      weight: 0.25,
      extract: (d) => d.precipSumMm,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 0, 12),
    },
    {
      name: "Rain risk",
      unit: "%",
      weight: 0.15,
      extract: (d) => d.precipProbMaxPct,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 20, 75),
    },
    {
      name: "Temperature",
      unit: "°C",
      weight: 0.25,
      extract: (d) => d.tempMax,
      curve: (x) => trapezoid(x, 2, 14, 25, 35),
    },
    {
      name: "Sky",
      unit: "%",
      weight: 0.2,
      extract: (d) => d.cloudCoverMeanPct,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 30, 100, 0.3),
    },
    {
      name: "Calm",
      unit: "km/h",
      weight: 0.15,
      extract: (d) => d.windMaxKmh,
      curve: (x) => trapezoid(x, -Infinity, -Infinity, 20, 55),
    },
  ],
  vetoes: [
    { reason: "Thunderstorm risk", cap: 15, applies: THUNDERSTORM },
    { reason: "Heavy rain", cap: 25, applies: (d) => (d.precipSumMm ?? 0) >= 25 },
    { reason: "Extreme heat", cap: 30, applies: (d) => (d.tempMax ?? -Infinity) >= 38 },
    { reason: "Extreme cold", cap: 30, applies: (d) => (d.tempMax ?? Infinity) <= -12 },
  ],
};

const NOT_AVAILABLE: ActivityResult = { status: "NOT_AVAILABLE", factors: [], vetoes: [] };

function scoreSurfing(day: DailyInputs): ActivityResult {
  if (day.marine === null || day.marine.waveHeightMaxM === null) return NOT_AVAILABLE;
  return scoreActivity(SURFING, day);
}

function indoorFrom(outdoor: ActivityResult): ActivityResult {
  if (outdoor.status !== "SCORED") return NOT_AVAILABLE;
  const score = Math.round(100 - 0.5 * outdoor.score);
  return {
    status: "SCORED",
    score,
    label: labelFor(score),
    factors: [
      {
        name: "Outdoor comfort (complement)",
        unit: "score",
        value: outdoor.score,
        score: score / 100,
        weight: 1,
      },
    ],
    vetoes: [],
  };
}

export function scoreDay(day: DailyInputs): Record<ActivityKey, ActivityResult> {
  const outdoor = scoreActivity(OUTDOOR, day);
  return {
    SKIING: scoreActivity(SKIING, day),
    SURFING: scoreSurfing(day),
    OUTDOOR_SIGHTSEEING: outdoor,
    INDOOR_SIGHTSEEING: indoorFrom(outdoor),
  };
}
