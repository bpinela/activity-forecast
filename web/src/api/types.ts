export type Location = {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  population: number | null;
};

export type Activity = "SKIING" | "SURFING" | "OUTDOOR_SIGHTSEEING" | "INDOOR_SIGHTSEEING";
export type ScoreStatus = "SCORED" | "NOT_AVAILABLE";
export type ScoreLabel = "GREAT" | "GOOD" | "FAIR" | "POOR" | "BAD";

export type FactorScore = {
  name: string;
  unit: string | null;
  value: number | null;
  score: number | null;
  weight: number;
};

export type ActivityScore = {
  activity: Activity;
  status: ScoreStatus;
  score: number | null;
  label: ScoreLabel | null;
  factors: FactorScore[];
  vetoes: string[];
};

export type DayForecast = {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  weatherCode: number | null;
  activities: ActivityScore[];
};

export type ActivityForecast = {
  timezone: string;
  elevation: number;
  days: DayForecast[];
};
