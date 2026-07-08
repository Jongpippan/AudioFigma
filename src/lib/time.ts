export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

export function secondsPerBar(bpm: number, beatsPerBar = 4) {
  return (60 / Math.max(1, bpm)) * beatsPerBar;
}

export function barAtTime(seconds: number, bpm: number, offset: number) {
  const relative = seconds - offset;
  const barDuration = secondsPerBar(bpm);
  return Math.floor(relative / barDuration) + 1;
}

export function getBarMarkers(duration: number, bpm: number, offset: number) {
  if (duration <= 0) return [];
  const barDuration = secondsPerBar(bpm);
  const firstBar = Math.floor(-offset / barDuration) + 1;
  const lastBar = Math.ceil((duration - offset) / barDuration) + 1;
  const markers: { time: number; bar: number }[] = [];

  for (let bar = firstBar; bar <= lastBar; bar += 1) {
    const time = offset + (bar - 1) * barDuration;
    if (time >= 0 && time <= duration) markers.push({ time, bar });
  }

  return markers;
}

export function timeTickInterval(pixelsPerSecond: number, minimumLabelGap = 72) {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return candidates.find((seconds) => seconds * pixelsPerSecond >= minimumLabelGap) ?? 600;
}
