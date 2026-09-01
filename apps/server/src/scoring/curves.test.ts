import { describe, expect, it } from "vitest";
import { trapezoid } from "./curves";

describe("trapezoid", () => {
  it("returns 0 outside [a, d]", () => {
    expect(trapezoid(-5, 0, 10, 20, 30)).toBe(0);
    expect(trapezoid(35, 0, 10, 20, 30)).toBe(0);
  });

  it("ramps linearly from a to b", () => {
    expect(trapezoid(2.5, 0, 10, 20, 30)).toBeCloseTo(0.25);
    expect(trapezoid(5, 0, 10, 20, 30)).toBeCloseTo(0.5);
  });

  it("holds 1 on the plateau [b, c]", () => {
    expect(trapezoid(10, 0, 10, 20, 30)).toBe(1);
    expect(trapezoid(15, 0, 10, 20, 30)).toBe(1);
    expect(trapezoid(20, 0, 10, 20, 30)).toBe(1);
  });

  it("falls linearly from c to d", () => {
    expect(trapezoid(25, 0, 10, 20, 30)).toBeCloseTo(0.5);
    expect(trapezoid(29, 0, 10, 20, 30)).toBeCloseTo(0.1);
  });

  it("supports one-sided rising curves via +Infinity", () => {
    expect(trapezoid(0.16, 0.02, 0.3, Infinity, Infinity)).toBeCloseTo(0.5);
    expect(trapezoid(1000, 0.02, 0.3, Infinity, Infinity)).toBe(1);
  });

  it("supports one-sided declining curves via -Infinity", () => {
    expect(trapezoid(10, -Infinity, -Infinity, 25, 65)).toBe(1);
    expect(trapezoid(45, -Infinity, -Infinity, 25, 65)).toBeCloseTo(0.5);
    expect(trapezoid(70, -Infinity, -Infinity, 25, 65)).toBe(0);
  });

  it("clamps to an optional floor", () => {
    expect(trapezoid(100, -Infinity, -Infinity, 30, 100, 0.3)).toBeCloseTo(0.3);
    expect(trapezoid(0, -Infinity, -Infinity, 30, 100, 0.3)).toBe(1);
  });
});
