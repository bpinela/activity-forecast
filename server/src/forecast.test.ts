import { describe, expect, it } from "vitest";
import { assembleDailyInputs } from "./forecast";
import type { ForecastResponse, MarineResponse } from "./openMeteo";

function forecastResponse(): ForecastResponse {
  return {
    timezone: "Europe/Lisbon",
    elevation: 33,
    daily: {
      time: ["2026-09-01", "2026-09-02"],
      weather_code: [1, 61],
      temperature_2m_max: [24, null],
      temperature_2m_min: [16, 15],
      snowfall_sum: [0, 0],
      rain_sum: [0, 4.2],
      precipitation_sum: [0, 4.2],
      precipitation_probability_max: [5, 80],
      wind_speed_10m_max: [14, 22],
      wind_gusts_10m_max: [30, 45],
      cloud_cover_mean: [20, 90],
    },
    hourly: {
      time: ["2026-09-01T00:00", "2026-09-01T12:00", "2026-09-02T00:00"],
      snow_depth: [0.1, 0.4, null],
    },
  };
}

const marineResponse: MarineResponse = {
  daily: {
    time: ["2026-09-01", "2026-09-02"],
    wave_height_max: [1.9, null],
    wave_period_max: [12, 8],
  },
};

describe("assembleDailyInputs", () => {
  it("merges forecast and marine data by date", () => {
    const days = assembleDailyInputs(forecastResponse(), marineResponse);
    expect(days).toHaveLength(2);
    expect(days[0]).toEqual({
      date: "2026-09-01",
      weatherCode: 1,
      tempMax: 24,
      tempMin: 16,
      snowfallSumCm: 0,
      snowDepthMaxM: 0.4,
      rainSumMm: 0,
      precipSumMm: 0,
      precipProbMaxPct: 5,
      windMaxKmh: 14,
      gustsMaxKmh: 30,
      cloudCoverMeanPct: 20,
      marine: { waveHeightMaxM: 1.9, wavePeriodMaxS: 12 },
    });
  });

  it("passes upstream nulls through and takes the per-day max of hourly snow depth", () => {
    const days = assembleDailyInputs(forecastResponse(), marineResponse);
    expect(days[1]?.tempMax).toBeNull();
    expect(days[1]?.snowDepthMaxM).toBeNull();
  });

  it("drops marine data for a day whose wave height is null", () => {
    const days = assembleDailyInputs(forecastResponse(), marineResponse);
    expect(days[1]?.marine).toBeNull();
  });

  it("handles a missing marine response entirely", () => {
    const days = assembleDailyInputs(forecastResponse(), null);
    expect(days.every((d) => d.marine === null)).toBe(true);
  });

  it("ignores marine days whose dates do not match the forecast", () => {
    const shifted: MarineResponse = {
      daily: {
        time: ["2026-08-31", "2026-09-03"],
        wave_height_max: [2, 2],
        wave_period_max: [10, 10],
      },
    };
    const days = assembleDailyInputs(forecastResponse(), shifted);
    expect(days.every((d) => d.marine === null)).toBe(true);
  });
});
