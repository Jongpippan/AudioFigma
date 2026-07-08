import { describe, expect, it } from "vitest";
import { barAtTime, formatTime, secondsPerBar } from "./time";

describe("timeline helpers", () => {
  it("formats fractional seconds", () => expect(formatTime(65.25)).toBe("1:05.3"));
  it("calculates a 4/4 bar duration", () => expect(secondsPerBar(120)).toBe(2));
  it("applies the movable bar-one offset", () => {
    expect(barAtTime(3, 120, 1)).toBe(2);
    expect(barAtTime(0.5, 120, 1)).toBe(0);
  });
});
