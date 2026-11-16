import { CheckCircle2 } from "lucide-react";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_MUTED_BADGE_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";

type DecisionShape = {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "CONFIRMED" | "SUPERSEDED";
  owner?: string | null;
};

type Props = { isDbBacked?: boolean; decisions?: DecisionShape[] };

const STATUS_CLASSES: Record<DecisionShape["status"], string> = {
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUPERSEDED: "border-slate-200 bg-slate-50 text-[var(--text-2)]",
};

const STATUS_LABELS: Record<DecisionShape["status"], string> = {
  DRAFT: "Entwurf",
  CONFIRMED: "Angenommen",
  SUPERSEDED: "Überholt",
};

export default function VereinsleitungMeetingDecisionsCard({ isDbBacked, decisions }: Props) {
  if (isDbBacked) {
    return (
      <section className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#0b4aa2]" />
          <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">Gefasste Beschlüsse</h3>
        </div>
        {decisions && decisions.length > 0 ? (
          <div className="mt-6 space-y-4">
            {decisions.map((d) => (
              <article key={d.id} className="rounded-[24px] border border-slate-200/80 bg-[var(--surface-2)] p-5 shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[1rem] font-semibold text-[var(--foreground)]">{d.title}</h4>
                    {d.description ? <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">{d.description}</p> : null}
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[d.status]}`}>{STATUS_LABELS[d.status]}</span>
                </div>
                {d.owner ? <p className="mt-3 text-right text-xs text-[var(--text-2)]">Verantwortlich: <span className="font-medium text-[var(--text-2)]">{d.owner}</span></p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 text-center">
            <p className="text-sm text-[var(--text-2)]">Beschlüsse noch nicht erfasst.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">POST /api/meetings/[id]/decisions</p>
          </div>
        )}
      </section>
    );
  }

  return null;
}
