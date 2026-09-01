import { afterEach, expect, test, vi } from "vitest";
import { endpoint, fetchActivityForecast, searchLocations } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

// regression: graphql-request v7 throws "Failed to construct 'URL'" on relative endpoints
test("the GraphQL endpoint is an absolute URL", () => {
  expect(() => new URL(endpoint)).not.toThrow();
  expect(new URL(endpoint).pathname).toBe("/graphql");
  expect(endpoint.startsWith(window.location.origin)).toBe(true);
});

function stubGraphQL(data: unknown) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("searchLocations unwraps the query payload", async () => {
  const locations = [{ id: "1", name: "Ericeira" }];
  const fetchMock = stubGraphQL({ searchLocations: locations });
  await expect(searchLocations("Ericeira")).resolves.toEqual(locations);
  expect(fetchMock).toHaveBeenCalledOnce();
});

test("fetchActivityForecast passes coordinates as variables", async () => {
  const forecast = { timezone: "Europe/Lisbon", elevation: 33, days: [] };
  const fetchMock = stubGraphQL({ activityForecast: forecast });
  await expect(fetchActivityForecast(38.96, -9.42)).resolves.toEqual(forecast);
  const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
  expect(body.variables).toEqual({ latitude: 38.96, longitude: -9.42 });
});
