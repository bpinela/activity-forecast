import { GraphQLError } from "graphql";
import { assembleDailyInputs } from "./forecast";
import { fetchForecast, fetchMarine, geocode, UpstreamError } from "./openMeteo";
import { type ActivityKey, scoreDay } from "./scoring/activities";
import type { ActivityResult, DailyInputs } from "./scoring/types";

function upstreamGuard(error: unknown): never {
  if (error instanceof UpstreamError) {
    throw new GraphQLError(error.message, { extensions: { code: "UPSTREAM_ERROR" } });
  }
  throw error;
}

function toActivityList(results: Record<ActivityKey, ActivityResult>) {
  return (Object.entries(results) as [ActivityKey, ActivityResult][]).map(([activity, r]) => ({
    activity,
    status: r.status,
    score: r.status === "SCORED" ? r.score : null,
    label: r.status === "SCORED" ? r.label : null,
    factors: r.factors,
    vetoes: r.vetoes,
  }));
}

function toDayForecast(day: DailyInputs) {
  return {
    date: day.date,
    tempMax: day.tempMax,
    tempMin: day.tempMin,
    weatherCode: day.weatherCode,
    activities: toActivityList(scoreDay(day)),
  };
}

export const resolvers = {
  Query: {
    async searchLocations(_parent: unknown, args: { query: string; limit: number }) {
      const limit = Math.min(Math.max(args.limit, 1), 10);
      const results = await geocode(args.query, limit).catch(upstreamGuard);
      return results.map((r) => ({
        id: r.id,
        name: r.name,
        region: r.admin1 ?? null,
        country: r.country ?? null,
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation ?? null,
        population: r.population ?? null,
      }));
    },

    async activityForecast(_parent: unknown, args: { latitude: number; longitude: number }) {
      const { latitude, longitude } = args;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new GraphQLError("latitude must be in [-90, 90] and longitude in [-180, 180]", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      // marine is enrichment: if it fails, surfing degrades to NOT_AVAILABLE
      const [forecast, marine] = await Promise.all([
        fetchForecast(latitude, longitude).catch(upstreamGuard),
        fetchMarine(latitude, longitude).catch(() => null),
      ]);
      const days = assembleDailyInputs(forecast, marine);
      return {
        timezone: forecast.timezone,
        elevation: forecast.elevation,
        days: days.map(toDayForecast),
      };
    },
  },
};
