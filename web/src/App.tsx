import { useState } from "react";
import { useActivityForecast } from "./api/hooks";
import type { Location } from "./api/types";
import { DayDetail } from "./components/DayDetail";
import { type CellRef, ForecastGrid, SkeletonGrid } from "./components/ForecastGrid";
import { LocationSearch } from "./components/LocationSearch";

function placeSubtitle(location: Location, elevation: number, timezone: string): string {
  const where = [location.region, location.country].filter(Boolean).join(", ");
  return `${where} · ${Math.round(elevation)} m · ${timezone}`;
}

export function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const forecast = useActivityForecast(location);

  const selectedDay = selectedCell
    ? (forecast.data?.days.find((d) => d.date === selectedCell.date) ?? null)
    : null;

  return (
    <main className="app">
      <header className="app-header">
        <h1>Activity Forecast</h1>
        <p>How good are the next 7 days for skiing, surfing and sightseeing — anywhere.</p>
      </header>

      <LocationSearch
        selected={location}
        onSelect={(next) => {
          setLocation(next);
          setSelectedCell(null);
        }}
      />

      {location === null && (
        <p className="hint">
          Search a place to rank its next 7 days across the four activities. Scores are explained —
          click any of them to see why.
        </p>
      )}

      {location !== null && forecast.isLoading && <SkeletonGrid />}

      {forecast.isError && (
        <div className="error" role="alert">
          <p>Could not load the forecast: {forecast.error.message.split(":")[0]}</p>
          <button type="button" onClick={() => forecast.refetch()}>
            Retry
          </button>
        </div>
      )}

      {location !== null && forecast.data && (
        <>
          <h2 className="place">
            {location.name}
            <span className="place-meta">
              {placeSubtitle(location, forecast.data.elevation, forecast.data.timezone)}
            </span>
          </h2>
          <ForecastGrid
            forecast={forecast.data}
            selected={selectedCell}
            onSelectCell={setSelectedCell}
          />
          {selectedCell && selectedDay && <DayDetail day={selectedDay} cell={selectedCell} />}
        </>
      )}
    </main>
  );
}
