import type { Activity, ActivityForecast, ActivityScore, DayForecast } from "../api/types";

export const ACTIVITY_ROWS: { key: Activity; label: string; icon: string }[] = [
  { key: "SKIING", label: "Skiing", icon: "⛷️" },
  { key: "SURFING", label: "Surfing", icon: "🏄" },
  { key: "OUTDOOR_SIGHTSEEING", label: "Outdoor sightseeing", icon: "📷" },
  { key: "INDOOR_SIGHTSEEING", label: "Indoor sightseeing", icon: "🏛️" },
];

export type CellRef = { date: string; activity: Activity };

export function dayActivity(day: DayForecast, activity: Activity): ActivityScore | undefined {
  return day.activities.find((a) => a.activity === activity);
}

function dayHeading(date: string, index: number): { top: string; bottom: string } {
  const d = new Date(`${date}T12:00:00`);
  return {
    top: index === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
    bottom: d.toLocaleDateString("en", { day: "numeric", month: "short" }),
  };
}

type Props = {
  forecast: ActivityForecast;
  selected: CellRef | null;
  onSelectCell: (cell: CellRef) => void;
};

export function ForecastGrid({ forecast, selected, onSelectCell }: Props) {
  return (
    <div className="grid-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th aria-label="Activity" />
            {forecast.days.map((day, index) => {
              const heading = dayHeading(day.date, index);
              return (
                <th key={day.date} scope="col">
                  <span className="day-name">{heading.top}</span>
                  <span className="day-date">{heading.bottom}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ACTIVITY_ROWS.map((row) => {
            const scores = forecast.days.map((day) => dayActivity(day, row.key));
            const allUnavailable = scores.every((s) => s?.status === "NOT_AVAILABLE");
            const best = Math.max(
              ...scores.map((s) => (s?.status === "SCORED" && s.score !== null ? s.score : -1)),
            );
            return (
              <tr key={row.key}>
                <th scope="row">
                  <span aria-hidden="true">{row.icon}</span> {row.label}
                </th>
                {allUnavailable ? (
                  <td className="na-row" colSpan={forecast.days.length}>
                    Not available — no surfable coast near this location
                  </td>
                ) : (
                  forecast.days.map((day) => {
                    const score = dayActivity(day, row.key);
                    if (!score || score.status !== "SCORED" || score.score === null) {
                      return (
                        <td key={day.date} className="cell cell-na">
                          —
                        </td>
                      );
                    }
                    const isSelected = selected?.date === day.date && selected.activity === row.key;
                    const isBest = score.score === best;
                    return (
                      <td key={day.date}>
                        <button
                          type="button"
                          className={`cell cell-${score.label}${isBest ? " best" : ""}${isSelected ? " selected" : ""}`}
                          aria-label={`${row.label} on ${day.date}: ${score.score} out of 100, ${score.label?.toLowerCase()}`}
                          onClick={() => onSelectCell({ date: day.date, activity: row.key })}
                        >
                          {score.score}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="grid-hint">
        Scores are 0–100 per activity. The ring marks each activity’s best day. Click a score for
        the why.
      </p>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid-wrap" aria-hidden="true">
      <table className="grid">
        <thead>
          <tr>
            <th />
            {Array.from({ length: 7 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
              <th key={i}>
                <span className="skeleton skeleton-text" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIVITY_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row">
                <span aria-hidden="true">{row.icon}</span> {row.label}
              </th>
              {Array.from({ length: 7 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                <td key={i}>
                  <span className="cell skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
