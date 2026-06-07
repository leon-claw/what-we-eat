import { describe, expect, it } from "vitest";
import { shouldEnableDebugConsole } from "./debugConsole";

describe("debug console", () => {
  it("enables Eruda when vconsole equals 1", () => {
    expect(shouldEnableDebugConsole("?vconsole=1")).toBe(true);
    expect(shouldEnableDebugConsole("?room=111&vconsole=1")).toBe(true);
  });

  it("does not enable Eruda without the opt-in value", () => {
    expect(shouldEnableDebugConsole("")).toBe(false);
    expect(shouldEnableDebugConsole("?vconsole=0")).toBe(false);
    expect(shouldEnableDebugConsole("?vconsole=true")).toBe(false);
  });
});
