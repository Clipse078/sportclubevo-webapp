import Link from "next/link";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_MUTED_BADGE_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";
import { MoreHorizontal } from "lucide-react";

export type KpiItem = {
  label: string;
  value: string | number;
  delta?: string | null;
  note: string;
  trend: "up" | "down" | "neutral" | "alert";
  href?: string;
};

type VereinsleitungKpiCardProps = {
  items?: KpiItem[];
};

const DEMO_KPIS: KpiItem[] = [
  { label: "Aktive Mitglieder", value: "452", delta: "+12", note: "vs. Vorjahr", trend: "up" },
  { label: "Gemeldete Teams", value: "24", delta: "+2", note: "vs. Vorjahr", trend: "up" },
  { label: "Trainer & Betreuer", value: "45", delta: "0", note: "vs. Vorjahr", trend: "neutral" },
];

function getDeltaClass(trend: KpiItem["trend"]) {
  switch (trend) {
    case "up": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "down": return "border-rose-200 bg-rose-50 text-rose-700";
    case "alert": return "border-amber-200 bg-amber-50 text-amber-700";
    default: return "border-slate-200 bg-slate-50 text-[var(--text-2)]";
  }
}

export default function VereinsleitungKpiCard({ items }: VereinsleitungKpiCardProps) {
  const displayItems = items && items.length > 0 ? items : DEMO_KPIS;
  const isReal = items && items.length > 0;

  return (
    <section className={VEREINSLEITUNG_PANEL_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">
          {isReal ? "Operative KPIs" : "Club KPIs · Demo"}
        </h3>
        <button type="button" aria-label="Mehr Optionen" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:bg-slate-50 hover:text-[var(--text-2)]">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {displayItems.map((kpi, i) => (
          <div key={i} className="VEREINSLEITUNG_INNER_ROW_CLASS transition hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--text-2)]">{kpi.label}</p>
                <p className={`mt-2 text-[1.95rem] font-bold leading-none ${kpi.trend === "alert" ? "text-amber-700" : "text-[var(--foreground)]"}`}>
                  {kpi.value}
                </p>
              </div>
              {kpi.delta ? (
                <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getDeltaClass(kpi.trend)}`}>
                  {kpi.delta}
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--muted)]">{kpi.note}</p>
              {kpi.href ? (
                <Link href={kpi.href} className="text-[11px] font-medium text-[#0b4aa2] hover:underline">Details →</Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
