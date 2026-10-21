import { Users } from "lucide-react";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_MUTED_BADGE_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import type { MeetingLiveData } from "@/lib/meetings/queries";

type ParticipantShape = { id: string; name: string; role?: string | null; status: "INVITED" | "PRESENT" | "ABSENT" | "EXCUSED" };

type Props = { dbMeeting?: MeetingLiveData | null; participants?: ParticipantShape[] };

const STATUS_COLOR = { PRESENT: "text-emerald-700", ABSENT: "text-rose-600", EXCUSED: "text-[var(--text-2)]", INVITED: "text-[var(--muted)]" };
const STATUS_LABEL = { PRESENT: "Anwesend", ABSENT: "Abwesend", EXCUSED: "Entschuldigt", INVITED: "Eingeladen" };

const MOCK_PARTICIPANTS = [
  { name: "Michael Weber", role: "Präsident", initials: "MW", status: "Anwesend" },
  { name: "Sarah Meier", role: "Finanzen", initials: "SM", status: "Anwesend" },
  { name: "Thomas Schmid", role: "Sportlicher Leiter", initials: "TS", status: "Anwesend" },
  { name: "Elena Rossi", role: "Juniorenfussball", initials: "ER", status: "Entschuldigt" },
  { name: "David Keller", role: "Aktuar", initials: "DK", status: "Anwesend" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").substring(0, 2).toUpperCase();
}

export default function VereinsleitungMeetingParticipantsCard({ dbMeeting, participants }: Props) {
  if (dbMeeting) {
    const count = dbMeeting.attendeeCount;
    const present = participants?.filter((p) => p.status === "PRESENT").length ?? 0;
    return (
      <section className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ProductDomainSceIcon name="people" size={16} className="h-4 w-4 text-[#0b4aa2]" />
            <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">Teilnehmer</h3>
          </div>
          {participants && participants.length > 0 ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)]">
              {present} / {participants.length}
            </span>
          ) : count ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)]">{count} Personen</span>
          ) : null}
        </div>

        {participants && participants.length > 0 ? (
          <div className="mt-5 space-y-4">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b4aa2]/10 text-[11px] font-semibold text-[#0b4aa2]">{initials(p.name)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{p.name}</p>
                    {p.role ? <p className="truncate text-xs text-[var(--text-2)]">{p.role}</p> : null}
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 text-center">
            <p className="text-sm text-[var(--text-2)]">Namentliche Teilnehmer noch nicht erfasst.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">POST /api/meetings/[id]/participants</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ProductDomainSceIcon name="people" size={16} className="h-4 w-4 text-[#0b4aa2]" />
          <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">Teilnehmer</h3>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)]">4 / 5</span>
      </div>
      <div className="mt-5 space-y-4">
        {MOCK_PARTICIPANTS.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b4aa2]/10 text-[11px] font-semibold text-[#0b4aa2]">{p.initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{p.name}</p>
                <p className="truncate text-xs text-[var(--text-2)]">{p.role}</p>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-semibold ${p.status === "Anwesend" ? "text-emerald-700" : "text-[var(--text-2)]"}`}>{p.status}</span>
          </div>
        ))}
      </div>
      <button type="button" className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--text-2)] transition hover:bg-slate-50 hover:text-[var(--foreground)]">Teilnehmer verwalten</button>
    </section>
  );
}
