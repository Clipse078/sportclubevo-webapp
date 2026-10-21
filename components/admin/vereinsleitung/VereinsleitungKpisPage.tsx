import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";

const KPI_GROUPS = [
  {
    title: "Mitglieder & Teams",
    items: [
      { label: "Aktive Mitglieder", value: "452", delta: "+12 vs. Vorjahr" },
      { label: "Gemeldete Teams", value: "24", delta: "+2 vs. Vorjahr" },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "Trainer & Betreuer", value: "45", delta: "0 vs. Vorjahr" },
      { label: "Offene Funktionen", value: "6", delta: "-1 vs. Vormonat" },
    ],
  },
  {
    title: "Strategische Entwicklung",
    items: [
      { label: "Aktive Initiativen", value: "8", delta: "+2 seit Jahresstart" },
      { label: "Offene Massnahmen", value: "17", delta: "-3 seit letzter Sitzung" },
    ],
  },
];

export default function VereinsleitungKpisPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {KPI_GROUPS.map((group) => (
        <section key={group.title} className={VEREINSLEITUNG_PANEL_CLASS}>
          <h3 className="text-[1.05rem] font-semibold text-[var(--foreground)]">{group.title}</h3>

          <div className="mt-4 space-y-3">
            {group.items.map((item) => (
              <div key={item.label} className={VEREINSLEITUNG_INNER_ROW_CLASS}>
                <p className="text-sm text-[var(--text-2)]">{item.label}</p>
                <p className="mt-2 text-[1.8rem] font-bold leading-none text-[var(--foreground)]">
                  {item.value}
                </p>
                <p className="mt-3 text-xs text-[var(--muted)]">{item.delta}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
