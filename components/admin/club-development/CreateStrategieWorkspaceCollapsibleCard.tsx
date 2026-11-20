"use client";

import { useCallback, useRef, useState, useTransition, type FormEventHandler } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

type Props = {
  canCreate: boolean;
  orgUnitOptions: { id: string; name: string }[];
};

export default function CreateStrategieWorkspaceCollapsibleCard({ canCreate, orgUnitOptions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [orgUnitIds, setOrgUnitIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);

  const toggleOrgUnit = (orgUnitId: string) => {
    setOrgUnitIds((prev) =>
      prev.includes(orgUnitId) ? prev.filter((id) => id !== orgUnitId) : [...prev, orgUnitId],
    );
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (!title.trim()) {
        setError("Bitte einen Titel eingeben.");
        return;
      }
      setError(null);
      startTransition(async () => {
        const result = await clubDevelopmentFetchJson<{ id: string }>("/api/club-development/club-strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), orgUnitIds }),
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        const params: Record<string, string | undefined> = { strategyId: result.data.id };
        const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
        if (orgQuery) params[CD_WORKSPACE_ORG_UNIT_QUERY] = orgQuery;
        setExpanded(false);
        setTitle("");
        setOrgUnitIds([]);
        router.push(buildStrategieUndZieleHref("strategie", params));
        router.refresh();
      });
    },
    [orgUnitIds, router, searchParams, title],
  );

  if (!canCreate) return null;

  return (
    <div ref={cardRef} className="flex w-full justify-end">
        <SceClubDevelopmentContextualCreateCollapsibleShell
          actionLabel="+ Strategie anlegen"
          contextLabel="Strategie"
          expanded={expanded}
          onExpandedChange={setExpanded}
          panelDomId="strategien-workspace-create-strategy-panel"
          cardTestId="strategien-workspace-create-strategy-card"
          collapseToggleTestId="strategien-workspace-create-strategy"
        >
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? <ClubDevelopmentFormError message={error} /> : null}
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--muted)]">Titel</span>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="strategie-create-title"
              />
            </label>
            {orgUnitOptions.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="text-xs text-[var(--muted)]">Org-Einheiten (optional, mehrfach)</legend>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                  {orgUnitOptions.map((unit) => (
                    <li key={unit.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={orgUnitIds.includes(unit.id)}
                          onChange={() => toggleOrgUnit(unit.id)}
                        />
                        {unit.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                onClick={() => setExpanded(false)}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--sce-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={pending}
                data-testid="strategie-create-submit"
              >
                {pending ? "Speichern…" : "Strategie anlegen"}
              </button>
            </div>
          </form>
        </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}