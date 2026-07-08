import { Clock3, Link2, MessageSquareText, UploadCloud, Waves } from "lucide-react";
import { CreateProjectForm } from "@/components/create-project-form";
import { PublicProjectList } from "@/components/public-project-list";

const features = [
  { icon: UploadCloud, title: "트랙 업로드", body: "MP3, WAV 등 오디오를 여러 트랙으로 올립니다." },
  { icon: Clock3, title: "시간 + 마디", body: "BPM과 움직일 수 있는 1마디 시작점으로 맥락을 맞춥니다." },
  { icon: MessageSquareText, title: "정확한 코멘트", body: "파형을 눌러 그 순간에 이름과 피드백을 남깁니다." },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-300">
          <Link2 size={13} /> 로그인 없이 링크 하나로 공유
        </div>
        <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl">
          음악을 들은 그 순간에<br /><span className="text-cyan-300">피드백을 고정하세요.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-400 sm:text-lg">
          파일과 메신저 사이를 오가지 마세요. AudioFigma는 파형의 정확한 위치에서 팀의 의견을 모읍니다.
        </p>
        <CreateProjectForm />
      </section>
      <PublicProjectList />
      <section className="border-y border-white/[0.06] bg-black/20">
        <div className="mx-auto grid max-w-5xl gap-px bg-white/[0.06] sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-[#070a0f] p-7 text-left">
              <Icon className="mb-5 text-cyan-300" size={22} />
              <h2 className="font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="mx-auto flex max-w-5xl items-center justify-between px-4 py-8 text-xs text-slate-600 sm:px-6">
        <span className="flex items-center gap-2"><Waves size={14} /> AudioFigma MVP</span>
        <span>링크를 가진 모든 사용자가 볼 수 있습니다.</span>
      </footer>
    </main>
  );
}
