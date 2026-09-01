import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { App } from "./App";
import type {
  Activity,
  ActivityForecast,
  ActivityScore,
  DayForecast,
  Location,
  ScoreLabel,
} from "./api/types";

export { setViewport } from "./viewportStub";

const ACTIVITIES: Activity[] = ["SKIING", "SURFING", "OUTDOOR_SIGHTSEEING", "INDOOR_SIGHTSEEING"];

/** A scored cell as `[score, label]`, or "na" meaning NOT_AVAILABLE. */
export type Cell = [number, ScoreLabel] | "na";

function activityScore(activity: Activity, cell: Cell): ActivityScore {
  if (cell === "na") {
    return { activity, status: "NOT_AVAILABLE", score: null, label: null, factors: [], vetoes: [] };
  }
  const [score, label] = cell;
  return {
    activity,
    status: "SCORED",
    score,
    label,
    factors: [
      { name: "Wave height", unit: "m", value: 1.8, score: 0.88, weight: 0.35 },
      { name: "Low wind", unit: "km/h", value: 12, score: 0.72, weight: 0.25 },
      { name: "Wave period", unit: "s", value: null, score: null, weight: 0.25 },
    ],
    vetoes: score <= 20 ? ["No meaningful snow cover"] : [],
  };
}

export function day(date: string, cells: [Cell, Cell, Cell, Cell]): DayForecast {
  return {
    date,
    tempMax: 21,
    tempMin: 14,
    weatherCode: 1,
    activities: ACTIVITIES.map((activity, i) => activityScore(activity, cells[i] as Cell)),
  };
}

export const DAYS: DayForecast[] = [
  day("2026-08-29", [
    [2, "BAD"],
    [77, "GOOD"],
    [91, "GREAT"],
    [69, "GOOD"],
  ]),
  day("2026-08-30", [
    [2, "BAD"],
    [52, "FAIR"],
    [89, "GREAT"],
    [61, "GOOD"],
  ]),
];

export const INLAND_DAYS: DayForecast[] = [
  day("2026-08-29", [[2, "BAD"], "na", [91, "GREAT"], [69, "GOOD"]]),
];

export function makeForecast(days: DayForecast[]): ActivityForecast {
  return { timezone: "Europe/Lisbon", elevation: 33, days };
}

export const ERICEIRA: Location = {
  id: "1",
  name: "Ericeira",
  region: "Lisbon District",
  country: "Portugal",
  latitude: 38.9629,
  longitude: -9.4157,
  elevation: 33,
  population: 10260,
};

export const MAFRA: Location = {
  id: "2",
  name: "Mafra",
  region: "Lisbon District",
  country: "Portugal",
  latitude: 38.9411,
  longitude: -9.3282,
  elevation: 250,
  population: 17986,
};

export function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
