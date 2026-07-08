"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineComment } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  duration: number;
  currentTime: number;
  active: boolean;
  comments: TimelineComment[];
  onSelect: (time: number) => void;
};

const BARS = 180;

async function decodePeaks(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("오디오 파일을 불러오지 못했습니다.");
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    const block = Math.max(1, Math.floor(buffer.length / BARS));
    return Array.from({ length: BARS }, (_, index) => {
      let peak = 0;
      const start = index * block;
      const end = Math.min(start + block, buffer.length);
      for (let sample = start; sample < end; sample += Math.max(1, Math.floor(block / 32))) {
        for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
      }
      return Math.max(0.04, peak);
    });
  } finally {
    void context.close();
  }
}

export function Waveform({ url, duration, currentTime, active, comments, onSelect }: Props) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    decodePeaks(url)
      .then((next) => { if (!cancelled) { setPeaks(next); setError(""); } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "파형 생성에 실패했습니다."); });
    return () => { cancelled = true; };
  }, [url]);

  const bars = useMemo(() => peaks.map((peak, index) => ({ x: (index / BARS) * 100, height: Math.max(4, peak * 76) })), [peaks]);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  function select(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onSelect(Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration)));
  }

  return (
    <div
      className={cn("relative h-28 cursor-crosshair overflow-hidden rounded-xl border bg-slate-950/70", active ? "border-cyan-400/30" : "border-white/[0.06]")}
      onClick={select}
      role="slider"
      aria-label="파형에서 재생 또는 댓글 위치 선택"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={active ? currentTime : 0}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") onSelect(Math.min(duration, currentTime + 1));
        if (event.key === "ArrowLeft") onSelect(Math.max(0, currentTime - 1));
      }}
    >
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,.2) 1px, transparent 1px)", backgroundSize: "5% 100%" }} />
      {peaks.length ? (
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
          {bars.map((bar, index) => <rect key={index} x={bar.x} y={(100 - bar.height) / 2} width={0.34} height={bar.height} rx={0.17} className={bar.x <= progress && active ? "fill-cyan-300" : "fill-slate-500"} />)}
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-xs text-slate-600">{error || "파형 분석 중…"}</div>
      )}
      {comments.map((comment, index) => (
        <button
          key={comment.id}
          type="button"
          className="absolute top-2 z-20 grid size-6 -translate-x-1/2 place-items-center rounded-full border border-amber-200/30 bg-amber-300 text-[10px] font-black text-slate-950 shadow-lg shadow-black/40"
          style={{ left: `${Math.min(100, (comment.position_seconds / duration) * 100)}%` }}
          title={`${comment.author_name}: ${comment.body}`}
          onClick={(event) => { event.stopPropagation(); onSelect(comment.position_seconds); }}
        >
          {index + 1}
        </button>
      ))}
      {active && <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white shadow-[0_0_8px_white]" style={{ left: `${progress}%` }} />}
    </div>
  );
}
