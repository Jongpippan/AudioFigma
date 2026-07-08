"use client";

import { useMemo } from "react";
import { formatTime, getMusicalGridLines, secondsPerBar, timeTickInterval, type MusicalGridDivision, type MusicalGridLine } from "@/lib/time";

type Props = {
  duration: number;
  bpm: number;
  offset: number;
  currentTime: number;
  pixelsPerSecond: number;
  onSeek: (time: number) => void;
};

function gridLabel(line: MusicalGridLine, division: MusicalGridDivision) {
  if (line.kind === "bar") return `${line.bar}`;
  if (division === 8) return `${line.bar}.${line.beat}.${line.subdivision}`;
  return `${line.bar}.${line.beat}`;
}

export function TimelineRuler({ duration, bpm, offset, currentTime, pixelsPerSecond, onSeek }: Props) {
  const pixelsPerBar = secondsPerBar(bpm) * pixelsPerSecond;
  const division: MusicalGridDivision = pixelsPerBar >= 360 ? 8 : pixelsPerBar >= 120 ? 4 : 1;
  const gridLines = useMemo(() => getMusicalGridLines(duration, bpm, offset, division), [bpm, division, duration, offset]);
  const timeMarkers = useMemo(() => {
    const interval = timeTickInterval(pixelsPerSecond);
    return Array.from({ length: Math.floor(duration / interval) + 1 }, (_, index) => index * interval);
  }, [duration, pixelsPerSecond]);
  const barLabelStep = Math.max(1, Math.ceil(32 / pixelsPerBar));
  const pixelsPerGridStep = pixelsPerBar / division;

  return (
    <div
      className="relative h-[72px] select-none overflow-hidden border-b border-white/[0.08] bg-slate-950/85"
      aria-label="시간과 마디 타임라인"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration)));
      }}
    >
      <div className="absolute inset-x-0 top-0 h-9 border-b border-white/[0.06]">
        {timeMarkers.map((time) => (
          <div key={time} className="absolute inset-y-0 border-l border-white/10" style={{ left: `${(time / duration) * 100}%` }}>
            {time + 42 / pixelsPerSecond <= duration && <span className="absolute left-1 top-2 whitespace-nowrap font-mono text-[10px] text-slate-400">{formatTime(time)}</span>}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-9">
        {gridLines.map((line) => {
          const label = gridLabel(line, division);
          const showBarLabel = line.kind === "bar" && (line.bar - 1) % barLabelStep === 0;
          const showSubdivisionLabel = line.kind !== "bar" && pixelsPerGridStep >= label.length * 5.5 + 5;
          const hasRightSpace = line.time + (label.length * 6 + 6) / pixelsPerSecond <= duration;
          return (
            <div
              key={`${line.bar}-${line.time}-${line.kind}`}
              data-testid={line.kind === "bar" ? "ruler-bar-marker" : "ruler-subdivision-marker"}
              className={line.kind === "bar" ? "absolute inset-y-0 border-l border-indigo-300/30" : line.kind === "beat" ? "absolute bottom-0 top-2 border-l border-indigo-200/15" : "absolute bottom-0 top-4 border-l border-white/[0.07]"}
              style={{ left: `${(line.time / duration) * 100}%` }}
            >
              {hasRightSpace && (showBarLabel || showSubdivisionLabel) && <span data-testid={line.kind === "bar" ? "bar-label" : "subdivision-label"} className={line.kind === "bar" ? "absolute left-1 top-1.5 whitespace-nowrap text-[10px] font-semibold text-indigo-100/80" : "absolute left-1 top-1 whitespace-nowrap font-mono text-[9px] text-slate-500"}>{label}</span>}
            </div>
          );
        })}
      </div>
      {offset >= 0 && offset <= duration && <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-amber-300" style={{ left: `${(offset / duration) * 100}%` }} aria-hidden="true" />}
      <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,.7)]" style={{ left: `${(currentTime / duration) * 100}%` }} />
    </div>
  );
}
