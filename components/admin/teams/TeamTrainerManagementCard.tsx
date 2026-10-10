"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import TeamRosterRemoveDialog from "@/components/admin/teams/roster/TeamRosterRemoveDialog";
import {
  enablePersonCapacity,
  fetchRosterPersonContext,
} from "@/components/admin/teams/roster/roster-onboarding-client";
import { getCanonicalSeasonLabel } from "@/lib/teams/jahrgang-rules";
import {
  mapRosterFetchErrorMessage,
  trainerMembershipStatusHint,
} from "@/lib/teams/roster-onboarding-messages";
import type { RosterPersonOnboardingContext } from "@/lib/teams/roster-onboarding-queries";

type TrainerMember = {
  id: string;
  status: string;
  roleLabel: string | null;
  isWebsiteVisible: boolean;
  sortOrder: number;
  remarks: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
};

type Props = {
  teamId: string;
  canManage: boolean;
  canManagePeople?: boolean;
  sectionId?: string;
  teamSeason: {
    id: string;
    displayName: string;
    status: string;
    trainerTeamWebsiteVisible: boolean;
    season: {
      id: string;
      key: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    };
    trainerTeamMembers: TrainerMember[];
  };
  /** Pre-fill add sheet (e.g. assignment-only remediation). */
  initialAddPerson?: PersonPickerResult | null;
  onInitialAddPersonConsumed?: () => void;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const fieldClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/30";
const labelClass = "block text-xs font-medium text-[var(--text-2)] mb-1.5";
const rosterContextNoticeClass =
  "rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm";

function getPersonName(person: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}) {
  return person.displayName || `${person.firstName} ${person.lastName}`;
}

export default function TeamTrainerManagementCard({
  teamId,
  canManage,
  canManagePeople = false,
  sectionId,
  teamSeason,
  initialAddPerson = null,
  onInitialAddPersonConsumed,
}: Props) {
  const router = useRouter();
  const activeMembers = teamSeason.trainerTeamMembers.filter((m) => m.status === "ACTIVE");
  const trainerCount = activeMembers.length;

  const saisonLabel = useMemo(() => {
    return getCanonicalSeasonLabel(teamSeason.season.startDate) ?? teamSeason.season.name;
  }, [teamSeason.season.startDate, teamSeason.season.name]);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonPickerResult | null>(null);
  const [personContext, setPersonContext] = useState<RosterPersonOnboardingContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [assignStatus, setAssignStatus] = useState("ACTIVE");
  const [roleLabel, setRoleLabel] = useState("");
  const [isWebsiteVisible, setIsWebsiteVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [remarks, setRemarks] = useState("");

  const [assignLoading, setAssignLoading] = useState(false);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<TrainerMember | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const activeTrainerPersonIds = useMemo(
    () => activeMembers.map((member) => member.person.id),
    [activeMembers],
  );

  const seasonMutable = teamSeason.status === "ACTIVE";

  useEffect(() => {
    if (!initialAddPerson) {
      return;
    }
    setSelectedPerson(initialAddPerson);
    setAddSheetOpen(true);
    onInitialAddPersonConsumed?.();
  }, [initialAddPerson, onInitialAddPersonConsumed]);

  useEffect(() => {
    if (!selectedPerson || !addSheetOpen) {
      setPersonContext(null);
      setContextError(null);
      return;
    }

    let cancelled = false;
    setContextLoading(true);
    setContextError(null);

    fetchRosterPersonContext({
      teamId,
      teamSeasonId: teamSeason.id,
      personId: selectedPerson.id,
    })
      .then((context) => {
        if (!cancelled) {
          setPersonContext(context);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContextError(err instanceof Error ? err.message : "Kontext konnte nicht geladen werden.");
          setPersonContext(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setContextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [addSheetOpen, selectedPerson, teamId, teamSeason.id]);

  function resetAddForm() {
    setAddSheetOpen(false);
    setSelectedPerson(null);
    setPersonContext(null);
    setContextError(null);
    setRoleLabel("");
    setIsWebsiteVisible(true);
    setSortOrder("0");
    setRemarks("");
    setAssignStatus("ACTIVE");
    setAssignError(null);
    setAssignMessage(null);
  }

  const blockAssignBecauseActive =
    personContext?.trainerMembership?.status === "ACTIVE";

  async function handleEnableTrainerCapacity() {
    if (!selectedPerson || !canManagePeople) {
      return;
    }

    setCapacityLoading(true);
    setAssignError(null);
    try {
      const updated = await enablePersonCapacity({
        personId: selectedPerson.id,
        capacity: "trainer",
      });
      setSelectedPerson(updated);
      setAssignMessage("Trainer-Kapazität aktiviert. Sie können die Person jetzt dem Trainerteam hinzufügen.");
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Kapazität konnte nicht aktiviert werden.");
    } finally {
      setCapacityLoading(false);
    }
  }

  async function handleAssign() {
    if (!canManage || !selectedPerson || !seasonMutable) {
      setAssignError(
        seasonMutable
          ? "Bitte zuerst eine Person auswählen."
          : "Trainerteam-Änderungen sind für diese Team-Saison nicht möglich.",
      );
      return;
    }

    if (blockAssignBecauseActive) {
      setAssignError("Diese Person ist bereits im Trainerteam dieser Saison.");
      return;
    }

    setAssignLoading(true);
    setAssignError(null);
    setAssignMessage(null);
    setRemoveError(null);

    try {
      const response = await fetch(
        `/api/teams/${teamId}/team-seasons/${teamSeason.id}/trainer-members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: selectedPerson.id,
            status: assignStatus,
            roleLabel,
            isWebsiteVisible,
            sortOrder: sortOrder.trim(),
            remarks,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          mapRosterFetchErrorMessage(
            data?.error,
            "Trainer konnte nicht dem Trainerteam hinzugefügt werden.",
          ),
        );
      }

      setAssignMessage(data?.message ?? "Trainer erfolgreich hinzugefügt.");
      resetAddForm();
      router.refresh();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleRemoveConfirm() {
    if (!canManage || !removeTarget) {
      return;
    }

    const member = removeTarget;
    setRemovingMemberId(member.id);
    setRemoveError(null);

    try {
      const response = await fetch(
        `/api/teams/${teamId}/team-seasons/${teamSeason.id}/trainer-members/${member.id}`,
        { method: "DELETE" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          mapRosterFetchErrorMessage(
            data?.error,
            "Trainer konnte nicht aus dem Trainerteam entfernt werden.",
          ),
        );
      }

      setRemoveTarget(null);
      router.refresh();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setRemovingMemberId(null);
    }
  }

  const membershipHint = personContext?.trainerMembership
    ? trainerMembershipStatusHint(personContext.trainerMembership.status)
    : null;

  return (
    <section
      id={sectionId}
      className={
        sectionId
          ? "scroll-mt-20 target:ring-2 target:ring-inset target:ring-[var(--sce-primary)]"
          : undefined
      }
      data-testid="team-trainer-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Trainerteam · {saisonLabel}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{trainerCount} Trainer</p>
        </div>

        {canManage && seasonMutable && trainerCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setAddSheetOpen(true)}
            data-testid="team-trainer-add-button"
          >
            Trainer hinzufügen
          </Button>
        ) : null}
      </div>

      {!seasonMutable ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Diese Team-Saison ist nicht aktiv — Trainerteam-Änderungen sind hier nicht möglich.
        </p>
      ) : null}

      <Sheet
        open={addSheetOpen}
        onClose={resetAddForm}
        title="Trainer hinzufügen"
        description={`Person dem Trainerteam für ${saisonLabel} zuordnen.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={resetAddForm}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={assignLoading}
              disabled={!selectedPerson || blockAssignBecauseActive || !seasonMutable}
              onClick={handleAssign}
              data-testid="team-trainer-add-confirm"
            >
              {personContext?.trainerMembership &&
              ["INACTIVE", "ARCHIVED"].includes(personContext.trainerMembership.status)
                ? "Wieder zum Trainerteam hinzufügen"
                : "Trainer hinzufügen"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">
            Bestehende Personen suchen. Neue Personen erfassen Sie unter{" "}
            <Link href="/dashboard/persons" className="font-medium text-[var(--blue)] hover:underline">
              People & Access
            </Link>
            .
          </p>

          <PeoplePicker
            mode="trainer"
            teamSeasonId={teamSeason.id}
            excludeIds={activeTrainerPersonIds}
            selected={selectedPerson}
            onSelect={setSelectedPerson}
            onClearSelected={() => setSelectedPerson(null)}
            placeholder="Trainer suchen nach Name…"
          />

          {selectedPerson ? (
            <div className="space-y-4">
              {contextLoading ? (
                <p className="text-xs text-[var(--muted)]">Prüfe Trainerteam-Status…</p>
              ) : null}
              {contextError ? (
                <p className="text-sm text-[var(--sce-danger)]">{contextError}</p>
              ) : null}

              {membershipHint ? (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)]">
                  {membershipHint}
                </p>
              ) : null}

              {personContext && !personContext.person.isTrainer ? (
                <div className={rosterContextNoticeClass}>
                  <p className="font-medium text-[var(--foreground)]">Keine Trainer-Kapazität</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Diese Person ist nicht als Trainer/in markiert.
                  </p>
                  {canManagePeople ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      loading={capacityLoading}
                      onClick={handleEnableTrainerCapacity}
                      data-testid="team-trainer-enable-trainer-capacity"
                    >
                      Als Trainer aktivieren
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Bitte Kapazität unter People & Access anpassen (people.manage).
                    </p>
                  )}
                </div>
              ) : null}

              {personContext && personContext.otherActiveTrainerTeams.length > 0 ? (
                <div className="text-xs text-[var(--muted)]">
                  <p className="font-medium text-[var(--text-2)]">Aktuell auch im Trainerteam:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {personContext.otherActiveTrainerTeams.map((row) => (
                      <li key={row.teamId}>
                        {row.teamName} ({row.seasonLabel})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!blockAssignBecauseActive && personContext?.person.isTrainer !== false ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className={labelClass}>Status</span>
                      <select
                        value={assignStatus}
                        onChange={(event) => setAssignStatus(event.target.value)}
                        className={fieldClass}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className={labelClass}>Rolle</span>
                      <input
                        type="text"
                        value={roleLabel}
                        onChange={(event) => setRoleLabel(event.target.value)}
                        className={fieldClass}
                        placeholder="z. B. Cheftrainer"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Sortierung</span>
                      <input
                        type="number"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value)}
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Bemerkungen</span>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <SwitchToggle
                    id="team-trainer-add-website-visible"
                    label="Auf Website anzeigen"
                    checked={isWebsiteVisible}
                    onChange={setIsWebsiteVisible}
                  />
                </>
              ) : null}

              {assignError ? (
                <p className="text-sm font-medium text-[var(--sce-danger)]">{assignError}</p>
              ) : null}
              {assignMessage ? (
                <p className="text-sm font-medium text-emerald-600">{assignMessage}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Sheet>

      <TeamRosterRemoveDialog
        open={removeTarget != null}
        title="Trainer aus Trainerteam entfernen"
        description={
          removeTarget
            ? `«${getPersonName(removeTarget.person)}» aus dem Trainerteam ${saisonLabel} entfernen?`
            : ""
        }
        confirmLabel="Aus Trainerteam entfernen"
        loading={removingMemberId != null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />

      {removeError ? (
        <p className="mt-3 text-sm font-medium text-[var(--sce-danger)]">{removeError}</p>
      ) : null}

      {trainerCount === 0 ? (
        <div className="mt-4" data-testid="team-trainer-empty">
          <p className="text-sm text-[var(--muted)]">
            Noch keine Trainer im Trainerteam der Saison {saisonLabel}.
          </p>
          {canManage && seasonMutable ? (
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAddSheetOpen(true)}
              data-testid="team-trainer-empty-add-button"
            >
              Trainer hinzufügen
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]" data-testid="team-trainer-list">
          {teamSeason.trainerTeamMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AdminAvatar name={getPersonName(member.person)} size="md" />
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/persons/${member.person.id}`}
                    className="truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--blue)]"
                  >
                    {getPersonName(member.person)}
                  </Link>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {member.roleLabel ?? "Keine Rolle hinterlegt"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusPill
                  label={member.status}
                  tone={member.status === "ACTIVE" ? "success" : "muted"}
                />
                {canManage && seasonMutable ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={removingMemberId === member.id}
                    onClick={() => setRemoveTarget(member)}
                  >
                    Entfernen
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
