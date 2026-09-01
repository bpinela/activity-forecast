import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { DAYS, INLAND_DAYS, setViewport } from "../fixtures";
import { ForecastGrid, type Selection } from "./ForecastGrid";

function renderGrid(days = DAYS, selected: Selection | null = null) {
  const onSelect = vi.fn();
  render(<ForecastGrid days={days} selected={selected} onSelect={onSelect} />);
  return onSelect;
}

test("wide layout: activities are rows, days are columns", () => {
  renderGrid();
  expect(screen.getByRole("rowheader", { name: "Surfing" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: /Sat Aug 29/ })).toBeInTheDocument();
});

test("narrow layout transposes: days become rows", () => {
  setViewport("narrow");
  renderGrid();
  expect(screen.getByRole("rowheader", { name: /Sat Aug 29/ })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: /Surfing/ })).toBeInTheDocument();
});

test("marks each activity's best day with a star", () => {
  renderGrid();
  const best = screen.getByRole("button", { name: "Surfing, 2026-08-29: 77 — good, best day" });
  expect(best).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Surfing, 2026-08-30: 52 — fair" }),
  ).toBeInTheDocument();
});

test("clicking a cell reports its day and activity indexes", async () => {
  const onSelect = renderGrid();
  await userEvent.click(screen.getByRole("button", { name: /Surfing, 2026-08-30/ }));
  expect(onSelect).toHaveBeenCalledWith({ day: 1, activity: 1 });
});

test("the selected cell is exposed via aria-pressed", () => {
  renderGrid(DAYS, { day: 0, activity: 2 });
  const cell = screen.getByRole("button", { name: /Outdoor sightseeing, 2026-08-29/ });
  expect(cell).toHaveAttribute("aria-pressed", "true");
});

test("a NOT_AVAILABLE cell renders dashed with a reason tooltip", () => {
  renderGrid(INLAND_DAYS);
  const cell = screen.getByRole("button", { name: "Surfing, 2026-08-29: not available" });
  expect(cell).toHaveClass("na");
  expect(cell).toHaveAttribute("title", expect.stringContaining("No wave data"));
  expect(cell).toHaveTextContent("—");
});
