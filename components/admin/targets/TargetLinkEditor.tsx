"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Check } from "lucide-react";
import { toggleEntityRef, isLinked } from "@/lib/linking/helpers";
import type { EntityRef } from "@/lib/linking/types";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";

type TargetLinkEditorProps = {
  targetId: string;
  /** Legacy JSON initiative refs — preserved on save; editing happens in TargetInitiativeLinksSection. */
  initialInitiativeRefs: EntityRef[];
  initialMeetingRefs: EntityRef[];
  /** All DB-registered meetings, fetched server-side by the edit page. */
  availableMeetings: EntityRef[];
};

export default function TargetLinkEditor({
  targetId,
  initialInitiativeRefs,
  initialMeetingRefs,
  availableMeetings,
}: TargetLinkEditorProps) {
  const router = useRouter();
  const [meetingRefs, setMeetingRefs] = useState<EntityRef[]>(initialMeetingRefs);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMeeting(option: EntityRef) {
    setSaved(false);
    setMeetingRefs((prev) => toggleEntityRef(prev, option));
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const res = await fetch(`/api/targets/${targetId}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initiativeRefs: initialInitiativeRefs,
          meetingRefs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Speichern.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition cursor-pointer select-none";
  const chipActive = "border-[#0b4aa2] bg-[#0b4aa2]/8 text-[#0b4aa2]";
  const chipInactive =
    "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-slate-300 hover:bg-[var(--surface-2)]";

  return (
    <section
      id="links"
      className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)]/60 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      data-testid="target-meeting-links-editor"
    >
      <div className="mb-5 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-[#0b4aa2]" />
        <h3 className="text-[1.05rem] font-semibold text-[var(--foreground)]">
          {CD_TARGET_COPY.meetingsEditorSection}
        </h3>
      </div>

      <p className="mb-4 text-[11px] text-[var(--muted)]">
        {CD_TARGET_COPY.vorhabenManagedInSectionAbove}
      </p>

      {error ? (
        <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="mb-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-700">
          ✓ Sitzungs-Verknüpfungen gespeichert.
        </div>
      ) : null}

      <div className="space-y-5">
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {CD_TARGET_COPY.linksMeetings}
          </p>
          {availableMeetings.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)] italic">
              Keine Sitzungen in der Datenbank.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[11px] text-[var(--muted)]">
                {CD_TARGET_COPY.meetingsEditorHint}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableMeetings.map((option) => {
                  const active = isLinked(meetingRefs, option.slug);
                  return (
                    <button
                      key={option.slug}
                      type="button"
                      onClick={() => toggleMeeting(option)}
                      className={`${chipBase} ${active ? chipActive : chipInactive}`}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                      {option.title}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
        <p className="text-[11px] text-[var(--muted)]">
          {meetingRefs.length} Sitzungs-Verknüpfung
          {meetingRefs.length !== 1 ? "en" : ""} gewählt
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[#0b4aa2] px-5 py-2 text-[12px] font-semibold text-white disabled:opacity-60 hover:bg-[#08357a]"
          data-testid="target-meeting-links-save"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Speichern
        </button>
      </div>
    </section>
  );
}