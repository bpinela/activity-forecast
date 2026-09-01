import type { ActivityScore, DayForecast } from "../api/types";
import { ACTIVITY_ROWS, type CellRef, dayActivity } from "./ForecastGrid";

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return "no data";
  const rounded = Math.round(value * 100) / 100;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

type Props = {
  day: DayForecast;
  cell: CellRef;
};

export function DayDetail({ day, cell }: Props) {
  const row = ACTIVITY_ROWS.find((r) => r.key === cell.activity);
  const score: ActivityScore | undefined = dayActivity(day, cell.activity);
  if (!row || !score || score.status !== "SCORED") return null;

  const date = new Date(`${day.date}T12:00:00`).toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="detail" aria-label={`Why ${row.label} scores ${score.score} on ${date}`}>
      <header className="detail-header">
        <h2>
          {row.icon} {row.label} — {date}
        </h2>
        <span className={`badge cell-${score.label}`}>
          {score.score} · {score.label?.toLowerCase()}
        </span>
        <span className="detail-meta">
          {day.tempMax !== null && day.tempMin !== null
            ? `${Math.round(day.tempMin)}–${Math.round(day.tempMax)} °C`
            : ""}
        </span>
      </header>
      {score.vetoes.map((veto) => (
        <p key={veto} className="veto">
          ⚠️ {veto} — score capped
        </p>
      ))}
      <table className="factors">
        <thead>
          <tr>
            <th>Factor</th>
            <th>Measured</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {score.factors.map((factor) => (
            <tr key={factor.name}>
              <td>
                {factor.name} <span className="factor-weight">×{factor.weight}</span>
              </td>
              <td>{formatValue(factor.value, factor.unit)}</td>
              <td>
                <div className="factor-bar">
                  <div
                    className="factor-bar-fill"
                    style={{ width: `${(factor.score ?? 0) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
