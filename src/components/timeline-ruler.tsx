"use client";

import { useMemo } from "react";
import { formatTime, secondsPerBar } from "@/lib/time";

type Props = { duration: number; bpm: number; offset: number; currentTime: number; onSeek: (time: number) => void };

export function TimelineRuler({ duration, bpm, offset, currentTime, onSeek }: Props) {
  const markers = useMemo(() => {
    if (!duration) return [];
    const result: { time: number; label: string; bar?: number }[] = [];
    const barLength = secondsPerBar(bpm);
    const firstBar = Math.floor((0 - offset) / barLength) + 1;
    for (let bar = firstBar; bar <= Math.ceil((duration - offset) / barLength) + 1; bar += 1) {
      const time = offset + (bar - 1) * barLength;
      if (time >= 0 && time <= duration) result.push({ time, label: `${bar}`, bar });
    }
    return result;
  }, [bpm, duration, offset]);

  return (
    <div className="relative h-14 select-none border-b border-white/[0.06] bg-slate-950/60" onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      onSeek(((event.clientX - rect.left) / rect.width) * duration);
    }}>
      <span className="absolute left-2 top-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Bars</span>
      {markers.map((marker) => (
        <div key={marker.bar} className="absolute bottom-0 top-0 border-l border-white/10" style={{ left: `${(marker.time / duration) * 100}%` }}>
          <span className="absolute left-1 top-1 text-[9px] text-slate-500">{marker.label}</span>
          <span className="absolute bottom-1 left-1 text-[9px] text-slate-700">{formatTime(marker.time)}</span>
        </div>
      ))}
      <div className="absolute bottom-0 top-0 w-px bg-cyan-300/80" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
    </div>
  );
}
