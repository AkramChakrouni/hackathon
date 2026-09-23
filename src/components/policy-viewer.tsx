"use client";

import { useEffect, useRef, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { wordDiff } from "@/lib/wdiff";

interface Sec { id: string; number: number; title: string; text: string; hash: string; version: string }
interface Pol { policy: { short: string; name: string; version: string; effective: string; file: string }; sections: Sec[]; updated: { policy: { version: string; effective: string }; sections: Sec[] } | null }

const norm = (s: string) => s.toLowerCase().replace(/[“”"„]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");

/** Highlights the quote inside the section text (whitespace/case-insensitive match). */
function Highlight({ text, quote }: { text: string; quote?: string }) {
  if (!quote) return <>{text}</>;
  const t = text.replace(/\s+/g, " "), q = norm(quote).replace(/^[“"'\s]+|[”"'\s.]+$/g, "");
  const i = norm(t).indexOf(q);
  if (i < 0) return <>{t}</>;
  return <>{t.slice(0, i)}<mark className="q">{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>;
}

export function PolicyViewer({ short, sectionId, quote, onClose }: { short: string; sectionId: string; quote?: string; onClose: () => void }) {
  const [data, setData] = useState<Pol | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const target = useRef<HTMLElement | null>(null);
  useEffect(() => { let live = true; fetch(`/api/policy?short=${encodeURIComponent(short)}`).then((r) => r.json()).then((d) => live && setData(d)); return () => { live = false; }; }, [short]);
  useEffect(() => { if (data) setTimeout(() => target.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 50); }, [data, showDiff]);
  const changed = new Set(data?.updated ? data.updated.sections.filter((u) => data.sections.find((c) => c.id === u.id)?.hash !== u.hash).map((u) => u.id) : []);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/60 backdrop-blur-[2px]" onClick={onClose}>
      <aside className="rise h-full w-[640px] overflow-auto border-l border-line bg-ink px-8 py-6 text-[15px]" onClick={(e) => e.stopPropagation()}>
        {!data ? <div className="text-mute">Loading policy…</div> : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">{data.policy.file}</div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">{data.policy.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[12px] text-mute">
                  <span className="rounded border border-line px-1.5 py-0.5">v{data.policy.version} · effective {data.policy.effective}</span>
                  {data.updated && <span className="rounded border border-warn/50 px-1.5 py-0.5 text-warn">v{data.updated.policy.version} · effective {data.updated.policy.effective} · {changed.size} section{changed.size === 1 ? "" : "s"} changed</span>}
                </div>
              </div>
              <button onClick={onClose} className="text-mute hover:text-fg"><X size={18} /></button>
            </div>
            {data.updated && (
              <button onClick={() => setShowDiff((v) => !v)} className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-[14px] ${showDiff ? "border-warn/60 bg-warn/10 text-warn" : "border-line text-mute hover:text-fg"}`}>
                <GitCompare size={15} /> {showDiff ? `Showing changes v${data.policy.version} → v${data.updated.policy.version}` : `Show what changed in v${data.updated.policy.version}`}
              </button>
            )}
            <div className="mt-6 space-y-6">
              {data.sections.map((s) => {
                const u = data.updated?.sections.find((x) => x.id === s.id);
                const isTarget = s.id === sectionId;
                return (
                  <section key={s.id} ref={isTarget ? (el) => { target.current = el; } : undefined} className={`rounded-md border p-4 ${isTarget ? "border-accent/50 bg-accent/5" : "border-line"}`}>
                    <div className="mb-2 flex items-center gap-2 font-mono text-[12px]"><span className={isTarget ? "text-accent" : "text-mute"}>{s.id}</span><span className="text-fg/80">{s.title}</span>{changed.has(s.id) && <span className="ml-auto rounded bg-warn/15 px-1.5 py-0.5 text-[11px] uppercase text-warn">changed in v{data.updated!.policy.version}</span>}</div>
                    <p className="leading-relaxed text-fg/90">
                      {showDiff && u && changed.has(s.id) ? wordDiff(s.text.replace(/\s+/g, " "), u.text.replace(/\s+/g, " ")).map((op, i) => <span key={i} className={op.t === "add" ? "wd-add" : op.t === "del" ? "wd-del" : ""}>{op.w}</span>) : <Highlight text={s.text} quote={isTarget ? quote : undefined} />}
                    </p>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
