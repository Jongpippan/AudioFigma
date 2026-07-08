"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, MessageSquarePlus, Music2, Pause, Play, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimelineRuler } from "@/components/timeline-ruler";
import { Waveform } from "@/components/waveform";
import type { Project, TimelineComment, Track } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import { barAtTime, formatTime } from "@/lib/time";

type TrackWithUrl = Track & { url: string };

function readDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(audio.duration) && audio.duration > 0) resolve(audio.duration);
      else reject(new Error("오디오 길이를 읽을 수 없습니다."));
    };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("지원하지 않는 오디오 파일입니다.")); };
    audio.src = url;
  });
}

export function ProjectWorkspace({ slug }: { slug: string }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSeekRef = useRef(0);
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<TrackWithUrl[]>([]);
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [activeTrackId, setActiveTrackId] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadProject = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) { setError("Supabase 연결 정보가 없습니다. README의 설정 단계를 먼저 완료해 주세요."); setLoading(false); return; }
    const { data: projectData, error: projectError } = await supabase.from("projects").select("*").eq("slug", slug).single();
    if (projectError || !projectData) { setError(projectError?.message || "프로젝트를 찾을 수 없습니다."); setLoading(false); return; }
    const [{ data: trackData, error: trackError }, { data: commentData, error: commentError }] = await Promise.all([
      supabase.from("tracks").select("*").eq("project_id", projectData.id).order("sort_order").order("created_at"),
      supabase.from("comments").select("*").eq("project_id", projectData.id).order("position_seconds").order("created_at"),
    ]);
    if (trackError || commentError) { setError(trackError?.message || commentError?.message || "프로젝트 데이터를 불러오지 못했습니다."); setLoading(false); return; }
    const withUrls = (trackData ?? []).map((track) => ({ ...track, url: supabase.storage.from("audio-tracks").getPublicUrl(track.storage_path).data.publicUrl }));
    setProject(projectData);
    setTracks(withUrls);
    setComments(commentData ?? []);
    setActiveTrackId((current) => current || withUrls[0]?.id || "");
    setLoading(false);
  }, [slug]);

  useEffect(() => { void Promise.resolve().then(loadProject); }, [loadProject]);
  useEffect(() => {
    const storedNickname = localStorage.getItem("audiofigma-nickname") || "";
    queueMicrotask(() => setNickname(storedNickname));
  }, []);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !project) return;
    const channel = supabase.channel(`project:${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `project_id=eq.${project.id}` }, () => void loadProject())
      .on("postgres_changes", { event: "*", schema: "public", table: "tracks", filter: `project_id=eq.${project.id}` }, () => void loadProject())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${project.id}` }, () => void loadProject())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadProject, project]);

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  const maxDuration = Math.max(0, ...tracks.map((track) => track.duration_seconds));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setCurrentTime(pendingSeekRef.current);
  }, [activeTrackId]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { await audio.play(); setPlaying(true); } else { audio.pause(); setPlaying(false); }
  }

  function seek(trackId: string, position: number, compose = true) {
    const targetTrack = tracks.find((track) => track.id === trackId);
    const safePosition = Math.min(position, targetTrack?.duration_seconds ?? position);
    pendingSeekRef.current = safePosition;
    setActiveTrackId(trackId);
    setSelectedTrackId(trackId);
    setSelectedPosition(compose ? safePosition : null);
    setCurrentTime(safePosition);
    requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (audio && audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = safePosition;
    });
  }

  async function uploadTrack(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const supabase = getSupabase();
    if (!file || !project || !supabase) return;
    event.target.value = "";
    if (!file.type.startsWith("audio/")) { setError("오디오 파일만 업로드할 수 있습니다."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("파일 크기는 50MB 이하여야 합니다."); return; }
    setUploading(true);
    setError("");
    try {
      const duration = await readDuration(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${project.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from("audio-tracks").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (storageError) throw storageError;
      const { error: insertError } = await supabase.from("tracks").insert({
        project_id: project.id,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        duration_seconds: duration,
        sort_order: tracks.length,
      });
      if (insertError) { await supabase.storage.from("audio-tracks").remove([storagePath]); throw insertError; }
      await loadProject();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "업로드에 실패했습니다.");
    } finally { setUploading(false); }
  }

  async function updateTiming(values: { bpm?: number; bar_offset_seconds?: number }) {
    const supabase = getSupabase();
    if (!supabase || !project) return;
    setProject({ ...project, ...values });
    const { error: updateError } = await supabase.from("projects").update(values).eq("id", project.id);
    if (updateError) { setError(updateError.message); await loadProject(); }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !project || selectedPosition === null || !selectedTrackId) return;
    setSavingComment(true);
    setError("");
    const cleanName = nickname.trim();
    const { error: commentError } = await supabase.from("comments").insert({
      project_id: project.id,
      track_id: selectedTrackId,
      position_seconds: selectedPosition,
      author_name: cleanName,
      body: body.trim(),
    });
    if (commentError) setError(commentError.message);
    else {
      localStorage.setItem("audiofigma-nickname", cleanName);
      setBody("");
      setSelectedPosition(null);
      await loadProject();
    }
    setSavingComment(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <main className="grid min-h-[70vh] place-items-center"><LoaderCircle className="animate-spin text-cyan-300" /></main>;
  if (!project) return <main className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-xl font-bold text-white">프로젝트를 열 수 없습니다.</h1><p className="mt-3 text-sm text-rose-400">{error}</p><Button className="mt-6" onClick={() => router.push("/")}>홈으로</Button></main>;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">Song project</p>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{project.title}</h1>
          <p className="mt-1 text-xs text-slate-600">링크를 가진 누구나 트랙을 듣고 코멘트할 수 있습니다.</p>
        </div>
        <Button variant="secondary" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "복사됨" : "공유 링크 복사"}</Button>
      </div>

      {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-300"><span>{error}</span><button onClick={() => setError("")} aria-label="오류 닫기"><X size={15} /></button></div>}

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <Button size="icon" onClick={togglePlayback} disabled={!activeTrack} aria-label={playing ? "일시 정지" : "재생"}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</Button>
          <span className="min-w-24 font-mono text-sm font-semibold text-white">{formatTime(currentTime)}</span>
          <div className="h-5 w-px bg-white/10" />
          <label className="flex items-center gap-2 text-xs text-slate-500">BPM <Input className="h-8 w-20" type="number" min={20} max={400} step="0.01" value={project.bpm} onChange={(event) => setProject({ ...project, bpm: Number(event.target.value) })} onBlur={(event) => void updateTiming({ bpm: Number(event.target.value) })} /></label>
          <label className="flex flex-1 items-center gap-2 text-xs text-slate-500 sm:max-w-md">1마디 시작 <input className="min-w-28 flex-1 accent-cyan-300" type="range" min={0} max={Math.max(1, maxDuration)} step={0.01} value={Math.max(0, project.bar_offset_seconds)} onChange={(event) => setProject({ ...project, bar_offset_seconds: Number(event.target.value) })} onPointerUp={(event) => void updateTiming({ bar_offset_seconds: Number(event.currentTarget.value) })} onBlur={(event) => void updateTiming({ bar_offset_seconds: Number(event.currentTarget.value) })} /><span className="w-14 font-mono text-slate-300">{formatTime(project.bar_offset_seconds)}</span></label>
          <input ref={fileRef} className="hidden" type="file" accept="audio/*" onChange={uploadTrack} />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="animate-spin" size={14} /> : <Upload size={14} />}{uploading ? "업로드 중" : "트랙 추가"}</Button>
        </div>

        <TimelineRuler duration={maxDuration || 1} bpm={project.bpm} offset={project.bar_offset_seconds} currentTime={currentTime} onSeek={(time) => activeTrack && seek(activeTrack.id, time, false)} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 divide-y divide-white/[0.06]">
            {tracks.length === 0 ? (
              <div className="grid min-h-80 place-items-center p-8 text-center">
                <div><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/[0.04] text-cyan-300"><Music2 size={24} /></span><h2 className="mt-5 font-bold text-white">첫 오디오 트랙을 올려주세요</h2><p className="mt-2 text-sm text-slate-500">최대 50MB · MP3, WAV, M4A, OGG 등</p><Button className="mt-5" onClick={() => fileRef.current?.click()}><Plus size={16} /> 트랙 추가</Button></div>
              </div>
            ) : tracks.map((track) => {
              const trackComments = comments.filter((comment) => comment.track_id === track.id);
              return (
                <article key={track.id} className="grid gap-3 p-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="min-w-0 py-1"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${track.id === activeTrack?.id ? "bg-cyan-300" : "bg-slate-700"}`} /><h2 className="truncate text-sm font-bold text-slate-200" title={track.name}>{track.name}</h2></div><p className="mt-2 pl-4 font-mono text-[10px] text-slate-600">{formatTime(track.duration_seconds)} · {trackComments.length} comments</p></div>
                  <Waveform url={track.url} duration={track.duration_seconds} currentTime={track.id === activeTrack?.id ? currentTime : 0} active={track.id === activeTrack?.id} comments={trackComments} onSelect={(time) => seek(track.id, time)} />
                </article>
              );
            })}
          </div>

          <aside className="border-t border-white/[0.07] bg-black/20 lg:border-l lg:border-t-0">
            <div className="border-b border-white/[0.07] px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-bold text-white"><MessageSquarePlus size={16} className="text-amber-300" /> 코멘트 <span className="text-slate-600">{comments.length}</span></h2></div>
            {selectedPosition !== null && (
              <form onSubmit={addComment} className="border-b border-cyan-300/15 bg-cyan-300/[0.035] p-4">
                <p className="mb-3 text-xs font-semibold text-cyan-300">{formatTime(selectedPosition)} · {barAtTime(selectedPosition, project.bpm, project.bar_offset_seconds)}마디</p>
                <Input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임 / 이름" maxLength={40} required />
                <Textarea className="mt-2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="이 순간에 대한 의견을 남겨주세요." maxLength={1000} required />
                <div className="mt-3 flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPosition(null)}>취소</Button><Button size="sm" disabled={savingComment}>{savingComment && <LoaderCircle className="animate-spin" size={13} />}등록</Button></div>
              </form>
            )}
            <div className="max-h-[620px] overflow-y-auto p-3">
              {comments.length === 0 ? <p className="px-2 py-10 text-center text-xs leading-5 text-slate-600">파형의 위치를 누르면<br />첫 코멘트를 남길 수 있습니다.</p> : comments.map((comment) => {
                const track = tracks.find((item) => item.id === comment.track_id);
                return <button key={comment.id} className="mb-2 block w-full rounded-xl border border-transparent p-3 text-left hover:border-white/[0.07] hover:bg-white/[0.03]" onClick={() => seek(comment.track_id, comment.position_seconds, false)}><div className="flex items-center justify-between gap-3"><strong className="truncate text-xs text-slate-200">{comment.author_name}</strong><span className="shrink-0 font-mono text-[10px] text-amber-300">{formatTime(comment.position_seconds)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-400">{comment.body}</p><p className="mt-2 truncate text-[10px] text-slate-700">{track?.name}</p></button>;
              })}
            </div>
          </aside>
        </div>
      </section>
      {activeTrack && <audio ref={audioRef} src={activeTrack.url} preload="metadata" onLoadedMetadata={(event) => { event.currentTarget.currentTime = Math.min(pendingSeekRef.current, event.currentTarget.duration); }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />}
      <p className="mt-4 text-center text-[10px] text-slate-700">파형을 선택하면 해당 위치로 이동하고 코멘트 입력창이 열립니다.</p>
    </main>
  );
}
