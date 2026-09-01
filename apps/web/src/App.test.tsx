import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { fetchActivityForecast, searchLocations } from "./api/client";
import { DAYS, ERICEIRA, INLAND_DAYS, MAFRA, makeForecast, renderApp } from "./fixtures";

vi.mock("./api/client", () => ({
  searchLocations: vi.fn(),
  fetchActivityForecast: vi.fn(),
}));

const search = vi.mocked(searchLocations);
const forecast = vi.mocked(fetchActivityForecast);

beforeEach(() => {
  search.mockReset();
  forecast.mockReset();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function submitSearch(place: string) {
  await userEvent.type(screen.getByLabelText("City or town"), place);
  await userEvent.click(screen.getByRole("button", { name: "Forecast" }));
}

test("idle offers worked examples instead of an empty screen", () => {
  renderApp();
  expect(screen.getByRole("heading", { name: "Activity forecast" })).toBeInTheDocument();
  for (const example of ["Chamonix", "Ericeira", "Queenstown", "Madrid"]) {
    expect(screen.getByRole("button", { name: example })).toBeInTheDocument();
  }
  expect(search).not.toHaveBeenCalled();
});

test("an example chip runs its own search", async () => {
  search.mockResolvedValue([ERICEIRA]);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await userEvent.click(screen.getByRole("button", { name: "Ericeira" }));
  expect(search).toHaveBeenCalledWith("Ericeira");
  expect(await screen.findByText(/Showing:/)).toBeInTheDocument();
});

test("loading shows a skeleton and blocks resubmission", async () => {
  const pending = deferred<(typeof ERICEIRA)[]>();
  search.mockReturnValue(pending.promise);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await submitSearch("Ericeira");
  expect(document.querySelector(".skeleton")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Forecast" })).toBeDisabled();
  pending.resolve([ERICEIRA]);
  expect(await screen.findByText(/Showing:/)).toBeInTheDocument();
});

test("ready names the resolved place, so a wrong geocode guess is visible", async () => {
  search.mockResolvedValue([ERICEIRA]);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await submitSearch("Ericeira");
  expect(await screen.findByText("Ericeira, Lisbon District, Portugal")).toBeInTheDocument();
  expect(forecast).toHaveBeenCalledWith(ERICEIRA.latitude, ERICEIRA.longitude);
  expect(screen.getByRole("rowheader", { name: "Surfing" })).toBeInTheDocument();
  expect(screen.getByText(/Select a cell/)).toBeInTheDocument();
});

test("other candidates surface as 'not it?' alternatives that re-forecast", async () => {
  search.mockResolvedValue([ERICEIRA, MAFRA]);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await submitSearch("Eri");
  expect(await screen.findByText(/not it\?/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Mafra, Lisbon District" }));
  expect(await screen.findByText("Mafra, Lisbon District, Portugal")).toBeInTheDocument();
  expect(forecast).toHaveBeenCalledWith(MAFRA.latitude, MAFRA.longitude);
});

test("an unknown place is an expected state, not an error banner", async () => {
  search.mockResolvedValue([]);
  renderApp();
  await submitSearch("xyzzyqwert");
  expect(await screen.findByText(/Couldn't find/)).toHaveTextContent("xyzzyqwert");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(forecast).not.toHaveBeenCalled();
});

test("a failed request is announced as an alert", async () => {
  search.mockRejectedValue(new Error("open-meteo responded 503"));
  renderApp();
  await submitSearch("Ericeira");
  expect(await screen.findByRole("alert")).toHaveTextContent("open-meteo responded 503");
});

test("selecting a cell opens its factor breakdown", async () => {
  search.mockResolvedValue([ERICEIRA]);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await submitSearch("Ericeira");
  await userEvent.click(await screen.findByRole("button", { name: /Surfing, 2026-08-29/ }));
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Surfing");
  expect(screen.getByText("Wave height")).toBeInTheDocument();
  expect(screen.queryByText(/Select a cell/)).not.toBeInTheDocument();
});

test("a new search clears the previous breakdown", async () => {
  search.mockResolvedValue([ERICEIRA]);
  forecast.mockResolvedValue(makeForecast(DAYS));
  renderApp();
  await submitSearch("Ericeira");
  await userEvent.click(await screen.findByRole("button", { name: /Surfing, 2026-08-29/ }));
  expect(screen.getByText("Wave height")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Forecast" }));
  await waitFor(() => expect(screen.queryByText("Wave height")).not.toBeInTheDocument());
});

test("a landlocked place renders surfing as unavailable, not zero", async () => {
  search.mockResolvedValue([{ ...ERICEIRA, name: "Madrid", region: null, country: "Spain" }]);
  forecast.mockResolvedValue(makeForecast(INLAND_DAYS));
  renderApp();
  await submitSearch("Madrid");
  expect(await screen.findByText("Madrid, Spain")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Surfing, 2026-08-29: not available" }),
  ).toBeInTheDocument();
});

test("an empty query is ignored", () => {
  renderApp();
  const form = screen.getByLabelText("City or town").closest("form");
  if (!form) throw new Error("search form not rendered");
  fireEvent.submit(form);
  expect(search).not.toHaveBeenCalled();
});
