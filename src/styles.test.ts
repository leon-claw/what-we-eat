import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("page scrolling", () => {
  it("allows vertical pan gestures on the active swipe card", () => {
    expect(styles).toContain("touch-action: pan-y");
  });
});
