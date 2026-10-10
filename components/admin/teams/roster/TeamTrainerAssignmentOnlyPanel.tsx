"use client";

import Link from "next/link";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { Button } from "@/components/ui/Button";
import { PERSON_FUNCTION_LABELS, type PersonFunctionKey } from "@/lib/people/functions";
import type { TrainerAssignmentOnlySuggestion } from "@/lib/teams/roster-onboarding-queries";

type Props = {
  suggestions: TrainerAssignmentOnlySuggestion[];
  seasonLabel: string | null;
  canManage: boolean;
  addingPersonId: string | null;
  onAdd: (person: TrainerAssignmentOnlySuggestion["person"]) => void;
};

function getPersonName(person: TrainerAssignmentOnlySuggestion["person"]) {
  return person.displayName || `${person.firstName} ${person.lastName}`;
}

function getFunctionLabel(functionKey: string) {
  return PERSON_FUNCTION_LABELS[functionKey as PersonFunctionKey] ?? functionKey;
}

export default function TeamTrainerAssignmentOnlyPanel({
  suggestions,
  seasonLabel,
  canManage,
  addingPersonId,
  onAdd,
}: Props) {
  if (suggestions.length === 0) {
    return null;
  }

  const seasonHint = seasonLabel ?? "dieser Saison";

  return (
    <div
      className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3"
      data-testid="team-trainer-assignment-only-panel"
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">
        Trainer-Zuordnung vervollständigen
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Als Trainer/in zugeordnet, aber noch nicht im Trainerteam {seasonHint}.
      </p>

      <ul className="mt-3 space-y-2">
        {suggestions.map((entry) => {
          const name = getPersonName(entry.person);
          return (
            <li
              key={entry.person.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`team-trainer-assignment-only-${entry.person.id}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <AdminAvatar name={name} size="md" />
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/persons/${entry.person.id}`}
                    className="truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--blue)]"
                  >
                    {name}
                  </Link>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {getFunctionLabel(entry.functionKey)}
                  </p>
                </div>
              </div>

              {canManage ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={addingPersonId === entry.person.id}
                  onClick={() => onAdd(entry.person)}
                  data-testid={`team-trainer-assignment-only-add-${entry.person.id}`}
                >
                  Zum Trainerteam hinzufügen
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
