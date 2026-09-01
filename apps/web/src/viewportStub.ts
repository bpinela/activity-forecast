import { vi } from "vitest";
import { NARROW_QUERY } from "./useIsNarrow";

/** jsdom ships no matchMedia, so every test picks a layout explicitly. */
export function setViewport(size: "wide" | "narrow"): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: size === "narrow" && query === NARROW_QUERY,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
