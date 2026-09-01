// Sanity-checks the scoring model against live Open-Meteo data for known places.
import { assembleDailyInputs } from "../src/forecast";
import { fetchForecast, fetchMarine, geocode } from "../src/openMeteo";
import { scoreDay } from "../src/scoring/activities";
import type { ActivityResult } from "../src/scoring/types";

const PLACES = ["Ericeira", "Madrid", "Reykjavik", "Dubai", "Zermatt", "Zugspitze"];

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
  const geo = (await geocode(place, 1))[0];
  if (!geo) {
    console.log(`\n=== ${place}: NOT FOUND ===`);
    continue;
  }
  const [forecast, marine] = await Promise.all([
    fetchForecast(geo.latitude, geo.longitude),
    fetchMarine(geo.latitude, geo.longitude).catch(() => null),
  ]);
  const days = assembleDailyInputs(forecast, marine);
  console.log(
    `\n=== ${geo.name}, ${geo.country ?? "?"} (${geo.latitude.toFixed(2)}, ${geo.longitude.toFixed(2)}, ${geo.elevation ?? "?"}m) ===`,
  );
  console.log("date         ski surf  out   in  notes");
  for (const day of days) {
    const r = scoreDay(day);
    console.log(
      `${day.date} ${cell(r.SKIING)} ${cell(r.SURFING)} ${cell(r.OUTDOOR_SIGHTSEEING)} ${cell(r.INDOOR_SIGHTSEEING)}  ${notes(r)}`,
    );
  }
}
