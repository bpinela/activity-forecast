export type MarineDay = {
  waveHeightMaxM: number | null;
  wavePeriodMaxS: number | null;
};

export type DailyInputs = {
  date: string;
  weatherCode: number | null;
  tempMax: number | null;
  tempMin: number | null;
  snowfallSumCm: number | null;
  snowDepthMaxM: number | null;
  rainSumMm: number | null;
  precipSumMm: number | null;
  precipProbMaxPct: number | null;
  windMaxKmh: number | null;
  gustsMaxKmh: number | null;
  cloudCoverMeanPct: number | null;
  marine: MarineDay | null;
};

export type FactorConfig = {
  name: string;
  unit: string;
  weight: number;
  extract: (day: DailyInputs) => number | null;
  curve: (x: number) => number;
};

export type Veto = {
  reason: string;
  cap: number;
  applies: (day: DailyInputs) => boolean;
};

export type ActivityConfig = {
  factors: FactorConfig[];
  vetoes: Veto[];
};

export type FactorResult = {
  name: string;
  unit: string;
  value: number | null;
  score: number | null;
  weight: number;
};

export type ScoreLabel = "GREAT" | "GOOD" | "FAIR" | "POOR" | "BAD";

export type ActivityResult =
  | {
      status: "SCORED";
      score: number;
      label: ScoreLabel;
      factors: FactorResult[];
      vetoes: string[];
    }
  | { status: "NOT_AVAILABLE"; factors: FactorResult[]; vetoes: string[] };
