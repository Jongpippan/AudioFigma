import { describe, expect, it } from "vitest";
import { barAtTime, formatTime, getBarMarkers, secondsPerBar, timeTickInterval } from "./time";

describe("timeline helpers", () => {
  it("formats fractional seconds", () => expect(formatTime(65.25)).toBe("1:05.3"));
  it("calculates a 4/4 bar duration", () => expect(secondsPerBar(120)).toBe(2));
  it("applies the movable bar-one offset", () => {
    expect(barAtTime(3, 120, 1)).toBe(2);
    expect(barAtTime(0.5, 120, 1)).toBe(0);
  });
  it("returns shared bar positions for rulers and tracks", () => {
    expect(getBarMarkers(5, 120, 1)).toEqual([
      { time: 1, bar: 1 },
      { time: 3, bar: 2 },
      { time: 5, bar: 3 },
    ]);
  });
  it("keeps time labels readable at each zoom", () => {
    expect(timeTickInterval(20)).toBe(5);
    expect(timeTickInterval(100)).toBe(1);
  });
});
