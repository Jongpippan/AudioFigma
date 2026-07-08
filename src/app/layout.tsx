import type { Metadata } from "next";
import Link from "next/link";
import { AudioLines } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AudioFigma — 음악 위에 바로 피드백",
  description: "파형의 정확한 순간에 코멘트를 남기는 오디오 협업 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header className="border-b border-white/[0.06] bg-slate-950/45 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white">
              <span className="grid size-8 place-items-center rounded-lg bg-cyan-400 text-slate-950"><AudioLines size={18} /></span>
              AudioFigma
            </Link>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-500">PUBLIC BETA</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
