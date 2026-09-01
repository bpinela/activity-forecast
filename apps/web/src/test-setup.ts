import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { setViewport } from "./viewportStub";

beforeEach(() => {
  setViewport("wide");
});

afterEach(() => {
  cleanup();
});
