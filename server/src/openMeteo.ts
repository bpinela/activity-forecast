const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

const TIMEOUT_MS = 8000;

export class UpstreamError extends Error {
  constructor(api: string, detail: string) {
    super(`Open-Meteo ${api} request failed: ${detail}`);
    this.name = "UpstreamError";
  }
}

export type GeoLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  admin1?: string;
  population?: number;
};

export type ForecastResponse = {
  timezone: string;
  elevation: number;
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    snowfall_sum: (number | null)[];
    rain_sum: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    wind_gusts_10m_max: (number | null)[];
    cloud_cover_mean: (number | null)[];
  };
  hourly: {
    time: string[];
    snow_depth: (number | null)[];
  };
};

export type MarineResponse = {
  daily: {
    time: string[];
    wave_height_max: (number | null)[];
    wave_period_max: (number | null)[];
  };
} | null;

async function getJson<T>(base: string, params: Record<string, string>, api: string): Promise<T> {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new UpstreamError(api, error instanceof Error ? error.message : String(error));
  }
  if (!res.ok) throw new UpstreamError(api, `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function geocode(query: string, limit: number): Promise<GeoLocation[]> {
  const json = await getJson<{ results?: GeoLocation[] }>(
    GEOCODING_URL,
    { name: query, count: String(limit), language: "en", format: "json" },
    "geocoding",
  );
  return json.results ?? [];
}

const DAILY_VARS = [
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

export function fetchForecast(latitude: number, longitude: number): Promise<ForecastResponse> {
  return getJson<ForecastResponse>(
    FORECAST_URL,
    {
      latitude: String(latitude),
      longitude: String(longitude),
      daily: DAILY_VARS,
      hourly: "snow_depth",
      timezone: "auto",
      forecast_days: "7",
    },
    "forecast",
  );
}

export function fetchMarine(latitude: number, longitude: number): Promise<MarineResponse> {
  return getJson<MarineResponse>(
    MARINE_URL,
    {
      latitude: String(latitude),
      longitude: String(longitude),
      daily: "wave_height_max,wave_period_max",
      timezone: "auto",
      forecast_days: "7",
    },
    "marine",
  );
}
