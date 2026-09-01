import type {
  ActivityConfig,
  ActivityResult,
  DailyInputs,
  FactorResult,
  ScoreLabel,
} from "./types";

export function labelFor(score: number): ScoreLabel {
  if (score >= 80) return "GREAT";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "FAIR";
  if (score >= 20) return "POOR";
  return "BAD";
}

export function scoreActivity(config: ActivityConfig, day: DailyInputs): ActivityResult {
  const factors: FactorResult[] = config.factors.map((f) => {
    const value = f.extract(day);
    return {
      name: f.name,
      unit: f.unit,
      value,
      score: value === null ? null : f.curve(value),
      weight: f.weight,
    };
  });

  const available = factors.filter((f) => f.score !== null);
  if (available.length === 0) {
    return { status: "NOT_AVAILABLE", factors, vetoes: [] };
  }

  const totalWeight = available.reduce((sum, f) => sum + f.weight, 0);
  const weighted =
    available.reduce((sum, f) => sum + (f.score as number) * f.weight, 0) / totalWeight;

  let score = Math.round(100 * weighted);
  const applied = config.vetoes.filter((v) => v.applies(day));
  for (const veto of applied) {
    score = Math.min(score, veto.cap);
  }

  return {
    status: "SCORED",
    score,
    label: labelFor(score),
    factors,
    vetoes: applied.map((v) => v.reason),
  };
}
