import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { day } from "../fixtures";
import { FactorPanel } from "./FactorPanel";

const SURF_INDEX = 1;

function surfScore(cell: Parameters<typeof day>[1][1]) {
  return day("2026-08-29", [[2, "BAD"], cell, [91, "GREAT"], [69, "GOOD"]]).activities[SURF_INDEX];
}

test("shows the score, band badge and weighted factor bars", () => {
  const score = surfScore([77, "GOOD"]);
  if (!score) throw new Error("fixture missing surf score");
  render(<FactorPanel date="2026-08-29" activityIndex={SURF_INDEX} score={score} />);

  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Surfing — Sat Aug 29: 77");
  expect(screen.getByText("good")).toHaveClass("badge");
  expect(screen.getByText("Wave height")).toBeInTheDocument();
  expect(screen.getByText("×0.35")).toBeInTheDocument();
  expect(screen.getByText("measured 1.8 m")).toBeInTheDocument();
});

test("a factor without data says so instead of faking a bar", () => {
  const score = surfScore([77, "GOOD"]);
  if (!score) throw new Error("fixture missing surf score");
  render(<FactorPanel date="2026-08-29" activityIndex={SURF_INDEX} score={score} />);
  expect(screen.getByText(/no data from the weather model/)).toBeInTheDocument();
});

test("veto caps are called out", () => {
  const score = surfScore([15, "BAD"]);
  if (!score) throw new Error("fixture missing surf score");
  render(<FactorPanel date="2026-08-29" activityIndex={SURF_INDEX} score={score} />);
  expect(screen.getByText(/No meaningful snow cover — score capped/)).toBeInTheDocument();
});

test("NOT_AVAILABLE explains itself without factors", () => {
  const score = surfScore("na");
  if (!score) throw new Error("fixture missing surf score");
  render(<FactorPanel date="2026-08-29" activityIndex={SURF_INDEX} score={score} />);
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("not available");
  expect(screen.getByText(/No wave data/)).toBeInTheDocument();
  expect(screen.queryByText("Wave height")).not.toBeInTheDocument();
});
