import { useState } from "react";
import { useActivityForecast, useLocationSearch } from "./api/hooks";
import type { Location } from "./api/types";
import { FactorPanel } from "./components/FactorPanel";
import {
  ACTIVITIES,
  BandLegend,
  ForecastGrid,
  GridSkeleton,
  type Selection,
} from "./components/ForecastGrid";

const EXAMPLES = ["Chamonix", "Ericeira", "Queenstown", "Madrid"];

function placeLabel(location: Location): string {
  return [location.name, location.region, location.country].filter(Boolean).join(", ");
}

export function App() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [pick, setPick] = useState<Location | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  const locations = useLocationSearch(submitted);
  const place = pick ?? locations.data?.[0] ?? null;
  const forecast = useActivityForecast(place);

  function search(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
    setPick(null);
    setSelected(null);
  }

  const alternatives = (locations.data ?? []).filter((l) => l.id !== place?.id).slice(0, 3);
  const isLoading = locations.isLoading || (place !== null && forecast.isLoading);
  const notFound = locations.isSuccess && locations.data.length === 0;
  const error = locations.error ?? forecast.error;

  const selectedDay = selected !== null ? forecast.data?.days[selected.day] : undefined;
  const selectedScore =
    selected !== null && selectedDay
      ? selectedDay.activities.find((a) => a.activity === ACTIVITIES[selected.activity]?.key)
      : undefined;

  return (
    <main>
      <h1>Activity forecast</h1>
      <p className="tagline">
        How good are the next 7 days for skiing, surfing and sightseeing, anywhere?
      </p>

      <search>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            search(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="City or town — e.g. Ericeira"
            aria-label="City or town"
          />
          <button type="submit" disabled={isLoading}>
            Forecast
          </button>
        </form>
      </search>

      {submitted === "" && (
        <p className="hint">
          Try{" "}
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="example"
              onClick={() => {
                setInput(example);
                search(example);
              }}
            >
              {example}
            </button>
          ))}
        </p>
      )}

      {isLoading && <GridSkeleton />}

      {notFound && (
        <p className="empty">
          Couldn't find “{submitted}”. Check the spelling or try a nearby larger town.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          The weather service didn't answer ({error.message.split(":")[0]}).{" "}
          <button
            type="button"
            className="example"
            onClick={() => (locations.error ? locations.refetch() : forecast.refetch())}
          >
            Retry
          </button>
        </p>
      )}

      {place && forecast.data && (
        <>
          <p className="resolved">
            Showing: <strong>{placeLabel(place)}</strong>
            {" · "}
            {Math.round(forecast.data.elevation)} m
            {alternatives.length > 0 && (
              <>
                {" — not it? "}
                {alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    className="example"
                    onClick={() => {
                      setPick(alt);
                      setSelected(null);
                    }}
                  >
                    {[alt.name, alt.region ?? alt.country].filter(Boolean).join(", ")}
                  </button>
                ))}
              </>
            )}
          </p>
          <ForecastGrid days={forecast.data.days} selected={selected} onSelect={setSelected} />
          <BandLegend />
          {selected !== null && selectedDay && selectedScore && (
            <FactorPanel
              date={selectedDay.date}
              activityIndex={selected.activity}
              score={selectedScore}
            />
          )}
          {selected === null && (
            <p className="hint">Select a cell to see why it scored that way.</p>
          )}
        </>
      )}
    </main>
  );
}
