"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { TimelineComment } from "@/lib/database.types";
import { getBarMarkers } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  duration: number;
  timelineDuration: number;
  bpm: number;
  barOffset: number;
  editingBarOffset: boolean;
  currentTime: number;
  active: boolean;
  comments: TimelineComment[];
  onSelect: (time: number) => void;
};

const PEAK_COUNT = 1600;

async function decodePeaks(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("오디오 파일을 불러오지 못했습니다.");
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    const block = Math.max(1, Math.floor(buffer.length / PEAK_COUNT));
    const rawPeaks = Array.from({ length: PEAK_COUNT }, (_, index) => {
      let peak = 0;
      const start = index * block;
      const end = Math.min(start + block, buffer.length);
      for (let sample = start; sample < end; sample += Math.max(1, Math.floor(block / 64))) {
        for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
      }
      return peak;
    });
    const maximum = Math.max(...rawPeaks, 0.001);
    return rawPeaks.map((peak) => Math.max(0.025, peak / maximum));
  } finally {
    void context.close();
  }
}

export function Waveform({ url, duration, timelineDuration, bpm, barOffset, editingBarOffset, currentTime, active, comments, onSelect }: Props) {
  const clipId = useId().replaceAll(":", "");
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    decodePeaks(url)
      .then((next) => { if (!cancelled) { setPeaks(next); setError(""); } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "파형 생성에 실패했습니다."); });
    return () => { cancelled = true; };
  }, [url]);

  const waveformPath = useMemo(() => {
    if (!peaks.length) return "";
    const upper = peaks.map((peak, index) => `${(index / (peaks.length - 1)) * 1000},${50 - peak * 45}`);
    const lower = peaks.map((peak, index) => `${(index / (peaks.length - 1)) * 1000},${50 + peak * 45}`).reverse();
    return `M${upper[0]} L${upper.slice(1).join(" L")} L${lower.join(" L")} Z`;
  }, [peaks]);
  const barMarkers = useMemo(() => getBarMarkers(timelineDuration, bpm, barOffset), [barOffset, bpm, timelineDuration]);
  const trackWidth = Math.min(100, (duration / timelineDuration) * 100);
  const progress = Math.min(100, (currentTime / timelineDuration) * 100);
  const trackProgress = active ? Math.min(100, (currentTime / duration) * 100) : 0;

  function select(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const time = ((event.clientX - rect.left) / rect.width) * timelineDuration;
    onSelect(Math.max(0, Math.min(duration, time)));
  }

  return (
    <div
      className={cn("relative h-28 cursor-crosshair overflow-hidden border-y border-r bg-slate-950/70", editingBarOffset ? "border-amber-300/50 bg-amber-300/[0.025]" : active ? "border-cyan-400/30" : "border-white/[0.06]")}
      onClick={select}
      role="slider"
      aria-label={editingBarOffset ? "1마디 시작점을 선택할 파형" : "파형에서 재생 또는 댓글 위치 선택"}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={active ? currentTime : 0}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") onSelect(Math.min(duration, currentTime + 1));
        if (event.key === "ArrowLeft") onSelect(Math.max(0, currentTime - 1));
      }}
    >
      {barMarkers.map((marker) => <div key={`${marker.bar}-${marker.time}`} data-testid="waveform-bar-marker" className="pointer-events-none absolute inset-y-0 border-l border-indigo-300/15" style={{ left: `${(marker.time / timelineDuration) * 100}%` }} />)}
      <div className="absolute inset-y-0 left-0 bg-slate-900/50" style={{ width: `${trackWidth}%` }}>
        {peaks.length ? (
          <svg data-testid="waveform-envelope" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 100" aria-label="오디오 파형">
            <defs><clipPath id={clipId}><rect x="0" y="0" width={trackProgress * 10} height="100" /></clipPath></defs>
            <path d={waveformPath} className="fill-slate-500/80" />
            <path d={waveformPath} className="fill-cyan-300" clipPath={`url(#${clipId})`} />
          </svg>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-slate-600">{error || "파형 분석 중…"}</div>
        )}
      </div>
      {comments.map((comment, index) => (
        <button
          key={comment.id}
          type="button"
          className="absolute top-2 z-20 grid size-6 -translate-x-1/2 place-items-center rounded-full border border-amber-200/30 bg-amber-300 text-[10px] font-black text-slate-950 shadow-lg shadow-black/40"
          style={{ left: `${Math.min(100, (comment.position_seconds / timelineDuration) * 100)}%` }}
          title={`${comment.author_name}: ${comment.body}`}
          onClick={(event) => { event.stopPropagation(); onSelect(comment.position_seconds); }}
        >
          {index + 1}
        </button>
      ))}
      {barOffset >= 0 && barOffset <= timelineDuration && <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-amber-300" style={{ left: `${(barOffset / timelineDuration) * 100}%` }} />}
      {active && <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white shadow-[0_0_8px_white]" style={{ left: `${progress}%` }} />}
      {editingBarOffset && <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 text-center text-[10px] font-semibold text-amber-200">이 트랙에서 1마디 시작 지점을 클릭하세요</div>}
    </div>
  );
}
