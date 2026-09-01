import type { ActivityScore, FactorScore } from "../api/types";
import { ACTIVITIES, fmtDate, unavailableReason } from "./ForecastGrid";

function factorDetail(factor: FactorScore): string {
  if (factor.value === null) return "no data from the weather model — weight redistributed";
  const value = Math.round(factor.value * 100) / 100;
  if (factor.unit === "score")
    return `outdoor comfort scored ${value}/100 — indoor is its complement`;
  return `measured ${value}${factor.unit ? ` ${factor.unit}` : ""}`;
}

interface Props {
  date: string;
  activityIndex: number;
  score: ActivityScore;
}

export function FactorPanel({ date, activityIndex, score }: Readonly<Props>) {
  const f = fmtDate(date);
  const available = score.status === "SCORED";
  return (
    <section className="panel" aria-live="polite">
      <h2>
        {ACTIVITIES[activityIndex]?.label} — {f.weekday} {f.date}
        {available ? (
          <>
            {": "}
            <strong>{score.score}</strong>{" "}
            <span className={`badge band-${score.label}`}>{score.label?.toLowerCase()}</span>
          </>
        ) : (
          ": not available"
        )}
      </h2>
      {!available && <p className="detail">{unavailableReason(score.activity)}</p>}
      {score.vetoes.map((veto) => (
        <p key={veto} className="veto">
          ⚠ {veto} — score capped
        </p>
      ))}
      <ul className="factors">
        {score.factors.map((factor) => (
          <li key={factor.name}>
            <div className="factor-head">
              <span className="factor-name">{factor.name}</span>
              <span className="weight">×{factor.weight.toFixed(2)}</span>
              {factor.score != null && (
                <span className="factor-score">{Math.round(factor.score * 100)}</span>
              )}
            </div>
            {factor.score != null && (
              <div className="track">
                <div className="fill" style={{ width: `${factor.score * 100}%` }} />
              </div>
            )}
            <p className="detail">{factorDetail(factor)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
