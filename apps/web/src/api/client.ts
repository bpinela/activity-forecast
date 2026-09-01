import { GraphQLClient, gql } from "graphql-request";
import type { ActivityForecast, Location } from "./types";

// graphql-request v7 does `new URL(url)` internally, so a relative endpoint throws
export const endpoint = new URL("/graphql", window.location.origin).href;

const client = new GraphQLClient(endpoint);

const SEARCH_LOCATIONS = gql`
  query SearchLocations($query: String!) {
    searchLocations(query: $query) {
      id
      name
      region
      country
      latitude
      longitude
      elevation
      population
    }
  }
`;

const ACTIVITY_FORECAST = gql`
  query ActivityForecast($latitude: Float!, $longitude: Float!) {
    activityForecast(latitude: $latitude, longitude: $longitude) {
      timezone
      elevation
      days {
        date
        tempMax
        tempMin
        weatherCode
        activities {
          activity
          status
          score
          label
          vetoes
          factors {
            name
            unit
            value
            score
            weight
          }
        }
      }
    }
  }
`;

export async function searchLocations(query: string): Promise<Location[]> {
  const data = await client.request<{ searchLocations: Location[] }>(SEARCH_LOCATIONS, { query });
  return data.searchLocations;
}

export async function fetchActivityForecast(
  latitude: number,
  longitude: number,
): Promise<ActivityForecast> {
  const data = await client.request<{ activityForecast: ActivityForecast }>(ACTIVITY_FORECAST, {
    latitude,
    longitude,
  });
  return data.activityForecast;
}
