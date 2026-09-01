import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchActivityForecast, searchLocations } from "./client";
import type { Location } from "./types";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useLocationSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["locations", trimmed],
    queryFn: () => searchLocations(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useActivityForecast(location: Location | null) {
  return useQuery({
    queryKey: ["forecast", location?.latitude, location?.longitude],
    queryFn: () => {
      if (!location) throw new Error("query is disabled without a location");
      return fetchActivityForecast(location.latitude, location.longitude);
    },
    enabled: location !== null,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
