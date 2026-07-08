import { describe, expect, it } from "vitest";
import { barAtTime, formatTime, getBarMarkers, getMusicalGridLines, secondsPerBar, timeTickInterval } from "./time";

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
  it("builds quarter and eighth positions with DAW-style labels", () => {
    const eighths = getMusicalGridLines(2, 120, 0, 8);
    expect(eighths).toContainEqual({ time: 1, bar: 1, beat: 3, subdivision: 5, kind: "beat" });
    expect(eighths).toContainEqual({ time: 1.25, bar: 1, beat: 3, subdivision: 6, kind: "subdivision" });
    expect(getMusicalGridLines(2, 120, 0, 4)).toContainEqual({ time: 1, bar: 1, beat: 3, subdivision: undefined, kind: "beat" });
  });
});
