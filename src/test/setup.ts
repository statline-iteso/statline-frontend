import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Recharts in jsdom: ResponsiveContainer measures its parent with ResizeObserver (missing in
 * jsdom) and renders nothing at 0x0. Every chart is rendered at a fixed 600x300 instead, so the
 * SVG is present and assertable. Charts pass a `width="100%"` container; other screens need
 * nothing extra.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const { cloneElement, createElement, isValidElement } = await import("react");
  type ReactNode = import("react").ReactNode;
  const SIZE = { width: 600, height: 300 };
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) =>
      createElement(
        "div",
        { className: "recharts-responsive-container", style: SIZE },
        isValidElement(children) ? cloneElement(children, SIZE) : children,
      ),
  };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
