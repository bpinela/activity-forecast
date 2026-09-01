import type { Activity, ActivityScore, DayForecast } from "../api/types";
import { useIsNarrow } from "../useIsNarrow";

export const ACTIVITIES: { key: Activity; label: string; short: string }[] = [
  { key: "SKIING", label: "Skiing", short: "Ski" },
  { key: "SURFING", label: "Surfing", short: "Surf" },
  { key: "OUTDOOR_SIGHTSEEING", label: "Outdoor sightseeing", short: "Outdoor" },
  { key: "INDOOR_SIGHTSEEING", label: "Indoor sightseeing", short: "Indoor" },
];

export function unavailableReason(activity: Activity): string {
  return activity === "SURFING"
    ? "No wave data for this location — likely no surfable coast nearby"
    : "Not available at this location";
}

const weekdayFmt = new Intl.DateTimeFormat("en", { weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function fmtDate(iso: string): { weekday: string; date: string } {
  const d = new Date(`${iso}T12:00:00`);
  return { weekday: weekdayFmt.format(d), date: dateFmt.format(d) };
}

export interface Selection {
  day: number;
  activity: number;
}

export function dayActivity(day: DayForecast, activity: Activity): ActivityScore | undefined {
  return day.activities.find((a) => a.activity === activity);
}

interface CellProps {
  cell: ActivityScore;
  label: string;
  date: string;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
}

function Cell({ cell, label, date, isSelected, isBest, onSelect }: Readonly<CellProps>) {
  const available = cell.status === "SCORED";
  const bandClass = available ? `band-${cell.label}` : "na";
  const bestSuffix = isBest ? ", best day" : "";
  const description = available
    ? `${cell.score} — ${cell.label?.toLowerCase()}${bestSuffix}`
    : "not available";
  return (
    <button
      type="button"
      className={isSelected ? `cell ${bandClass} selected` : `cell ${bandClass}`}
      title={available ? undefined : unavailableReason(cell.activity)}
      aria-pressed={isSelected}
      aria-label={`${label}, ${date}: ${description}`}
      onClick={onSelect}
    >
      {isBest && (
        <span className="star" aria-hidden>
          ★
        </span>
      )}
      {available ? cell.score : "—"}
    </button>
  );
}

function DayHeader({ date }: Readonly<{ date: string }>) {
  const f = fmtDate(date);
  return (
    <>
      {/* the gap has to be in the markup: CSS blocks separate them visually, names need it too */}
      <span className="weekday">{f.weekday}</span> <span className="date">{f.date}</span>
    </>
  );
}

interface Props {
  days: DayForecast[];
  selected: Selection | null;
  onSelect: (selection: Selection) => void;
}

export function ForecastGrid({ days, selected, onSelect }: Readonly<Props>) {
  const isNarrow = useIsNarrow();

  const bestByActivity = ACTIVITIES.map(({ key }) => {
    const scores = days
      .map((d) => dayActivity(d, key)?.score)
      .filter((s): s is number => typeof s === "number");
    return scores.length ? Math.max(...scores) : null;
  });

  function cellAt(dayIndex: number, activityIndex: number) {
    const day = days[dayIndex];
    const activity = ACTIVITIES[activityIndex];
    const cell = day && activity ? dayActivity(day, activity.key) : undefined;
    if (!day || !activity || !cell) return null;
    return (
      <Cell
        cell={cell}
        label={activity.label}
        date={day.date}
        isSelected={selected?.day === dayIndex && selected?.activity === activityIndex}
        isBest={cell.score !== null && cell.score === bestByActivity[activityIndex]}
        onSelect={() => onSelect({ day: dayIndex, activity: activityIndex })}
      />
    );
  }

  // Narrow puts days down the side: 4 columns fit a phone where 7 never will.
  if (isNarrow) {
    return (
      <table className="grid grid-narrow">
        <thead>
          <tr>
            <th scope="col" className="corner">
              Day
            </th>
            {ACTIVITIES.map((activity, a) => (
              <th key={activity.key} scope="col">
                <span aria-hidden>{activity.short}</span>
                <span className="sr-only">{ACTIVITIES[a]?.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}>
              <th scope="row">
                <DayHeader date={d.date} />
              </th>
              {ACTIVITIES.map((activity, a) => (
                <td key={activity.key}>{cellAt(i, a)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="scroll">
      <table className="grid">
        <thead>
          <tr>
            <th scope="col" className="corner">
              Activity
            </th>
            {days.map((d) => (
              <th key={d.date} scope="col">
                <DayHeader date={d.date} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIVITIES.map((activity, a) => (
            <tr key={activity.key}>
              <th scope="row">{activity.label}</th>
              {days.map((d, i) => (
                <td key={d.date}>{cellAt(i, a)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LEGEND: [string, string][] = [
  ["band-BAD", "bad"],
  ["band-POOR", "poor"],
  ["band-FAIR", "fair"],
  ["band-GOOD", "good"],
  ["band-GREAT", "great"],
  ["na", "not available"],
];

export function BandLegend() {
  return (
    <div className="legend">
      {LEGEND.map(([cls, label]) => (
        <span key={cls} className="chip">
          <i className={`swatch ${cls}`} aria-hidden /> {label}
        </span>
      ))}
      <span className="chip">★ best day</span>
    </div>
  );
}

export function GridSkeleton() {
  const isNarrow = useIsNarrow();
  const rows = isNarrow ? 8 : 5;
  const columns = isNarrow ? 5 : 8;
  return (
    <div className={isNarrow ? "skeleton skeleton-narrow" : "skeleton"} aria-hidden>
      {Array.from({ length: rows }, (_, row) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div key={row} className="skeleton-row">
          {Array.from({ length: columns }, (_, col) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <div key={col} className="skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}
