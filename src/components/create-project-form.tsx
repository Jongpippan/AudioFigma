"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase";

function makeSlug() {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function CreateProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("120");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase 환경 변수가 필요합니다. README의 설정 단계를 확인해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const slug = makeSlug();
    const { error: createError } = await supabase.from("projects").insert({
      slug,
      title: title.trim(),
      bpm: Number(bpm),
      bar_offset_seconds: 0,
    });
    if (createError) {
      setError(createError.message);
      setBusy(false);
      return;
    }
    router.push(`/p/${slug}`);
  }

  return (
    <form onSubmit={createProject} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 sm:flex sm:items-end sm:gap-3 sm:p-5">
      <label className="block flex-1 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        곡 프로젝트 이름
        <Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: Midnight Drive v3" maxLength={120} required />
      </label>
      <label className="mt-3 block text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:mt-0 sm:w-28">
        BPM
        <Input className="mt-2" type="number" min={20} max={400} step="0.01" value={bpm} onChange={(event) => setBpm(event.target.value)} required />
      </label>
      <Button className="mt-4 w-full sm:mt-0 sm:w-auto" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" size={17} /> : <>프로젝트 만들기 <ArrowRight size={17} /></>}
      </Button>
      {error && <p role="alert" className="mt-3 text-left text-sm text-rose-400 sm:absolute sm:translate-y-12">{error}</p>}
    </form>
  );
}
