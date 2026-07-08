"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, AudioLines, CalendarDays, Gauge, LoaderCircle, Music2 } from "lucide-react";
import type { Project } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";

type PublicProject = Project & { trackCount: number };

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" });

export function PublicProjectList() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) { setError("Supabase 연결 정보가 없습니다."); setLoading(false); return; }
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (projectError) { setError(projectError.message); setLoading(false); return; }
    if (!projectData?.length) { setProjects([]); setLoading(false); return; }

    const projectIds = projectData.map((project) => project.id);
    const { data: trackData, error: trackError } = await supabase
      .from("tracks")
      .select("project_id")
      .in("project_id", projectIds);
    if (trackError) { setError(trackError.message); setLoading(false); return; }

    const trackCounts = new Map<string, number>();
    for (const track of trackData ?? []) trackCounts.set(track.project_id, (trackCounts.get(track.project_id) ?? 0) + 1);
    setProjects(projectData.map((project) => ({ ...project, trackCount: trackCounts.get(project.id) ?? 0 })));
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(loadProjects); }, [loadProjects]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const channel = supabase.channel("public-project-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => void loadProjects())
      .on("postgres_changes", { event: "*", schema: "public", table: "tracks" }, () => void loadProjects())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadProjects]);

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6" aria-labelledby="public-projects-title">
      <div className="mb-5 flex items-end justify-between gap-4 text-left">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">Public songs</p>
          <h2 id="public-projects-title" className="mt-2 text-2xl font-black tracking-tight text-white">공개 곡 목록</h2>
          <p className="mt-1 text-sm text-slate-500">최근 생성된 50곡을 누구나 열어보고 피드백할 수 있습니다.</p>
        </div>
        <span className="hidden text-xs text-slate-600 sm:block">{projects.length} songs</span>
      </div>

      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.02]"><LoaderCircle className="animate-spin text-cyan-300" size={20} /><span className="sr-only">곡 목록 불러오는 중</span></div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] px-5 py-8 text-center text-sm text-rose-300">곡 목록을 불러오지 못했습니다: {error}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center"><Music2 className="mx-auto text-slate-700" /><p className="mt-3 text-sm text-slate-500">아직 공개된 곡이 없습니다. 첫 프로젝트를 만들어보세요.</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/p/${project.slug}`} className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-300"><AudioLines size={17} /></span>
                <ArrowUpRight className="text-slate-700 transition group-hover:text-cyan-300" size={17} />
              </div>
              <h3 className="mt-5 truncate font-bold text-slate-100" title={project.title}>{project.title}</h3>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5"><Gauge size={12} />{project.bpm} BPM</span>
                <span className="flex items-center gap-1.5"><Music2 size={12} />{project.trackCount} tracks</span>
                <span className="flex items-center gap-1.5"><CalendarDays size={12} />{dateFormatter.format(new Date(project.created_at))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
