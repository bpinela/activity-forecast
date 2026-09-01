import type { ForecastResponse, MarineResponse } from "./openMeteo";
import type { DailyInputs } from "./scoring/types";

export function assembleDailyInputs(
  forecast: ForecastResponse,
  marine: MarineResponse,
): DailyInputs[] {
  const snowMaxByDate = new Map<string, number>();
  forecast.hourly.time.forEach((t, i) => {
    const depth = forecast.hourly.snow_depth[i];
    if (depth == null) return;
    const date = t.slice(0, 10);
    snowMaxByDate.set(date, Math.max(snowMaxByDate.get(date) ?? 0, depth));
  });

  const marineByDate = new Map<string, { height: number | null; period: number | null }>();
  marine?.daily.time.forEach((date, i) => {
    marineByDate.set(date, {
      height: marine.daily.wave_height_max[i] ?? null,
      period: marine.daily.wave_period_max[i] ?? null,
    });
  });

  const d = forecast.daily;
  return d.time.map((date, i) => {
    const waves = marineByDate.get(date);
    return {
      date,
      weatherCode: d.weather_code[i] ?? null,
      tempMax: d.temperature_2m_max[i] ?? null,
      tempMin: d.temperature_2m_min[i] ?? null,
      snowfallSumCm: d.snowfall_sum[i] ?? null,
      snowDepthMaxM: snowMaxByDate.get(date) ?? null,
      rainSumMm: d.rain_sum[i] ?? null,
      precipSumMm: d.precipitation_sum[i] ?? null,
      precipProbMaxPct: d.precipitation_probability_max[i] ?? null,
      windMaxKmh: d.wind_speed_10m_max[i] ?? null,
      gustsMaxKmh: d.wind_gusts_10m_max[i] ?? null,
      cloudCoverMeanPct: d.cloud_cover_mean[i] ?? null,
      marine:
        waves && waves.height !== null
          ? { waveHeightMaxM: waves.height, wavePeriodMaxS: waves.period }
          : null,
    };
  });
}
