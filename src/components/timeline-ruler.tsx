"use client";

import { useMemo } from "react";
import { formatTime, getBarMarkers, secondsPerBar, timeTickInterval } from "@/lib/time";

type Props = {
  duration: number;
  bpm: number;
  offset: number;
  currentTime: number;
  pixelsPerSecond: number;
  onSeek: (time: number) => void;
};

export function TimelineRuler({ duration, bpm, offset, currentTime, pixelsPerSecond, onSeek }: Props) {
  const barMarkers = useMemo(() => getBarMarkers(duration, bpm, offset), [bpm, duration, offset]);
  const timeMarkers = useMemo(() => {
    const interval = timeTickInterval(pixelsPerSecond);
    return Array.from({ length: Math.floor(duration / interval) + 1 }, (_, index) => index * interval);
  }, [duration, pixelsPerSecond]);
  const barLabelStep = Math.max(1, Math.ceil(54 / (secondsPerBar(bpm) * pixelsPerSecond)));

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
            <span className="absolute left-1 top-2 whitespace-nowrap font-mono text-[10px] text-slate-400">{formatTime(time)}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-9">
        {barMarkers.map((marker) => (
          <div key={`${marker.bar}-${marker.time}`} data-testid="ruler-bar-marker" className="absolute inset-y-0 border-l border-indigo-300/20" style={{ left: `${(marker.time / duration) * 100}%` }}>
            {(marker.bar - 1) % barLabelStep === 0 && <span className="absolute left-1 top-2 whitespace-nowrap text-[10px] font-semibold text-indigo-200/70">{marker.bar}마디</span>}
          </div>
        ))}
      </div>
      {offset >= 0 && offset <= duration && <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-amber-300" style={{ left: `${(offset / duration) * 100}%` }} aria-hidden="true" />}
      <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,.7)]" style={{ left: `${(currentTime / duration) * 100}%` }} />
    </div>
  );
}
