import { CalendarDays, Circle, PlusCircle } from "lucide-react";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_MUTED_BADGE_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";

type ActionShape = { id: string; title: string; owner?: string | null; dueDate?: Date | null; status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED" };
type Props = { isDbBacked?: boolean; actions?: ActionShape[] };

const MOCK_ACTIONS = [
  { title: "Feedback zu Website-Designs sammeln und an Agentur senden", ownerInitials: "MW", due: "Bis 20.04.2024", completed: false },
  { title: "Vertrag 1. Mannschaft aufsetzen", ownerInitials: "TS", due: "Bis 25.04.2024", completed: true },
  { title: "Stellenausschreibung A-Junioren Co-Trainer publizieren", ownerInitials: "DK", due: "Bis 30.04.2024", completed: false },
];

function formatSwissDate(date: Date | string) {
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

const STATUS_COLORS = { OPEN: "text-[var(--foreground)]", IN_PROGRESS: "text-blue-700", DONE: "text-[var(--muted)] line-through", CANCELLED: "text-[var(--muted)] line-through" };

export default function VereinsleitungMeetingActionsCard({ isDbBacked, actions }: Props) {
  if (isDbBacked) {
    return (
      <section className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">Neue Massnahmen</h3>
        {actions && actions.length > 0 ? (
          <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200/80 bg-[var(--surface-2)] shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-4 px-4 py-4">
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${a.status === "DONE" ? "border-[#0b4aa2] bg-[#0b4aa2] text-white" : "border-slate-300 bg-[var(--surface-2)] text-[var(--muted)]"}`}>
                  <Circle className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-5 ${STATUS_COLORS[a.status]}`}>{a.title}</p>
                  {a.owner ? <p className="mt-0.5 text-[11px] text-[var(--text-2)]">{a.owner}</p> : null}
                </div>
                {a.dueDate ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)] shrink-0">
                    <CalendarDays className="h-3.5 w-3.5" />{formatSwissDate(a.dueDate)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 text-center">
            <p className="text-sm text-[var(--text-2)]">Massnahmen noch nicht erfasst.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">POST /api/meetings/[id]/actions</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">Neue Massnahmen</h3>
      <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200/80 bg-[var(--surface-2)] shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
        {MOCK_ACTIONS.map((a) => (
          <div key={a.title} className="flex items-start gap-4 px-4 py-4 transition hover:bg-slate-50/70">
            <button type="button" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${a.completed ? "border-[#0b4aa2] bg-[#0b4aa2] text-white" : "border-slate-300 bg-[var(--surface-2)] text-[var(--muted)]"}`}>
              <Circle className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold leading-5 ${a.completed ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>{a.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0b4aa2]/10 text-[10px] font-semibold text-[#0b4aa2]">{a.ownerInitials}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)]"><CalendarDays className="h-3.5 w-3.5" />{a.due}</span>
            </div>
          </div>
        ))}
        <button type="button" className="flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-[var(--text-2)] transition hover:bg-slate-50 hover:text-[var(--text-2)]">
          <PlusCircle className="h-4 w-4" />Massnahme hinzufügen
        </button>
      </div>
    </section>
  );
}
