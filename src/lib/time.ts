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
