// Sanity-checks the scoring model against live Open-Meteo data for known places.
// Self-contained on purpose: the real API clients land in the graphql-api slice.
import { scoreDay } from "../src/scoring/activities";
import type { ActivityResult, DailyInputs } from "../src/scoring/types";

const PLACES = ["Ericeira", "Madrid", "Reykjavik", "Dubai", "Zermatt", "Zugspitze"];

const DAILY = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "snowfall_sum",
  "rain_sum",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "cloud_cover_mean",
].join(",");

type Geo = {
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country_code?: string;
};

async function getJson(url: URL): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  return (await res.json()) as Record<string, unknown>;
}

async function geocode(name: string): Promise<Geo | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  const json = (await getJson(url)) as { results?: Geo[] };
  return json.results?.[0] ?? null;
}

async function fetchDays(lat: number, lon: number): Promise<DailyInputs[]> {
  const fUrl = new URL("https://api.open-meteo.com/v1/forecast");
  fUrl.searchParams.set("latitude", String(lat));
  fUrl.searchParams.set("longitude", String(lon));
  fUrl.searchParams.set("daily", DAILY);
  fUrl.searchParams.set("hourly", "snow_depth");
  fUrl.searchParams.set("timezone", "auto");
  fUrl.searchParams.set("forecast_days", "7");

  const mUrl = new URL("https://marine-api.open-meteo.com/v1/marine");
  mUrl.searchParams.set("latitude", String(lat));
  mUrl.searchParams.set("longitude", String(lon));
  mUrl.searchParams.set("daily", "wave_height_max,wave_period_max");
  mUrl.searchParams.set("timezone", "auto");
  mUrl.searchParams.set("forecast_days", "7");

  // biome-ignore lint/suspicious/noExplicitAny: throwaway validation script over untyped payloads
  const [f, m] = (await Promise.all([getJson(fUrl), getJson(mUrl)])) as any[];

  const snowMaxByDate = new Map<string, number>();
  if (f.hourly?.time) {
    f.hourly.time.forEach((t: string, i: number) => {
      const v = f.hourly.snow_depth[i];
      if (v == null) return;
      const date = t.slice(0, 10);
      snowMaxByDate.set(date, Math.max(snowMaxByDate.get(date) ?? 0, v));
    });
  }

  const marineByDate = new Map<string, { h: number | null; p: number | null }>();
  if (!m.error && m.daily?.time) {
    m.daily.time.forEach((date: string, i: number) => {
      marineByDate.set(date, { h: m.daily.wave_height_max[i], p: m.daily.wave_period_max[i] });
    });
  }

  return f.daily.time.map((date: string, i: number): DailyInputs => {
    const marine = marineByDate.get(date);
    return {
      date,
      weatherCode: f.daily.weather_code[i],
      tempMax: f.daily.temperature_2m_max[i],
      tempMin: f.daily.temperature_2m_min[i],
      snowfallSumCm: f.daily.snowfall_sum[i],
      snowDepthMaxM: snowMaxByDate.get(date) ?? null,
      rainSumMm: f.daily.rain_sum[i],
      precipSumMm: f.daily.precipitation_sum[i],
      precipProbMaxPct: f.daily.precipitation_probability_max[i],
      windMaxKmh: f.daily.wind_speed_10m_max[i],
      gustsMaxKmh: f.daily.wind_gusts_10m_max[i],
      cloudCoverMeanPct: f.daily.cloud_cover_mean[i],
      marine:
        marine && marine.h !== null ? { waveHeightMaxM: marine.h, wavePeriodMaxS: marine.p } : null,
    };
  });
}

function cell(r: ActivityResult): string {
  return r.status === "SCORED" ? String(r.score).padStart(4) : " n/a";
}

const SHORT: Record<string, string> = {
  SKIING: "ski",
  SURFING: "surf",
  OUTDOOR_SIGHTSEEING: "outdoor",
  INDOOR_SIGHTSEEING: "indoor",
};

function notes(results: Record<string, ActivityResult>): string {
  const parts: string[] = [];
  for (const [key, r] of Object.entries(results)) {
    if (r.status === "SCORED" && r.vetoes.length > 0) {
      parts.push(`${SHORT[key]}: ${r.vetoes.join(" & ")}`);
    }
  }
  return parts.join(" | ");
}

for (const place of PLACES) {
  const geo = await geocode(place);
  if (!geo) {
    console.log(`\n=== ${place}: NOT FOUND ===`);
    continue;
  }
  const days = await fetchDays(geo.latitude, geo.longitude);
  console.log(
    `\n=== ${geo.name}, ${geo.country_code} (${geo.latitude.toFixed(2)}, ${geo.longitude.toFixed(2)}, ${geo.elevation ?? "?"}m) ===`,
  );
  console.log("date         ski surf  out   in  notes");
  for (const day of days) {
    const r = scoreDay(day);
    console.log(
      `${day.date} ${cell(r.SKIING)} ${cell(r.SURFING)} ${cell(r.OUTDOOR_SIGHTSEEING)} ${cell(r.INDOOR_SIGHTSEEING)}  ${notes(r)}`,
    );
  }
}
