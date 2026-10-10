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
import { evaluatePlayerBirthYearEligibility } from "@/lib/teams/player-birth-year-eligibility";
import {
  formatAllowedBirthYearsLabel,
  presentRosterBirthYearEligibility,
} from "@/lib/teams/roster-eligibility-presentation";
import TeamRosterEligibilityNotice from "@/components/admin/teams/roster/TeamRosterEligibilityNotice";
import {
  mapRosterFetchErrorMessage,
  squadMembershipStatusHint,
} from "@/lib/teams/roster-onboarding-messages";
import type { RosterPersonOnboardingContext } from "@/lib/teams/roster-onboarding-queries";

type SquadMember = {
  id: string;
  status: string;
  shirtNumber: number | null;
  positionLabel: string | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
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
    dateOfBirth?: string | null;
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
    shortName: string | null;
    status: string;
    squadWebsiteVisible: boolean;
    season: {
      id: string;
      key: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    };
    teamAgeGroup?: string | null;
    playerSquadMembers: SquadMember[];
  };
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
  { value: "INJURED", label: "Verletzt" },
  { value: "ABSENT", label: "Abwesend" },
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

function getBirthYear(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCFullYear();
}

function formatBirthDate(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("de-CH");
}

export default function TeamSquadManagementCard({
  teamId,
  canManage,
  canManagePeople = false,
  sectionId,
  teamSeason,
}: Props) {
  const router = useRouter();
  const activeMembers = teamSeason.playerSquadMembers.filter((m) => m.status === "ACTIVE");
  const playerCount = activeMembers.length;

  const saisonLabel = useMemo(() => {
    return getCanonicalSeasonLabel(teamSeason.season.startDate) ?? teamSeason.season.name;
  }, [teamSeason.season.startDate, teamSeason.season.name]);

  const allowedBirthYearsLabel = useMemo(() => {
    const evaluation = evaluatePlayerBirthYearEligibility({
      categoryCode: teamSeason.teamAgeGroup,
      seasonStartDate: teamSeason.season.startDate,
      birthDate: null,
    });

    return formatAllowedBirthYearsLabel(evaluation.allowedBirthYears);
  }, [teamSeason.teamAgeGroup, teamSeason.season.startDate]);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonPickerResult | null>(null);
  const [personContext, setPersonContext] = useState<RosterPersonOnboardingContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [assignStatus, setAssignStatus] = useState("ACTIVE");
  const [shirtNumber, setShirtNumber] = useState("");
  const [positionLabel, setPositionLabel] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [isWebsiteVisible, setIsWebsiteVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [remarks, setRemarks] = useState("");

  const [assignLoading, setAssignLoading] = useState(false);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<SquadMember | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const activeSquadPersonIds = useMemo(
    () => activeMembers.map((member) => member.person.id),
    [activeMembers],
  );

  const selectedPersonEligibility = useMemo(() => {
    if (!selectedPerson) {
      return null;
    }

    const evaluation = evaluatePlayerBirthYearEligibility({
      categoryCode: teamSeason.teamAgeGroup,
      seasonStartDate: teamSeason.season.startDate,
      birthDate: selectedPerson.dateOfBirth,
    });

    return presentRosterBirthYearEligibility({
      kind: evaluation.kind,
      allowedBirthYears: evaluation.allowedBirthYears,
      birthYear: evaluation.birthYear,
      personId: selectedPerson.id,
      canEditPerson: canManagePeople,
      returnTo: `/dashboard/teams/${teamId}/kader`,
    });
  }, [
    canManagePeople,
    selectedPerson,
    teamId,
    teamSeason.season.startDate,
    teamSeason.teamAgeGroup,
  ]);

  const blockAssignBecauseEligibility = selectedPersonEligibility != null;

  const seasonMutable = teamSeason.status === "ACTIVE";

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
    setShirtNumber("");
    setPositionLabel("");
    setIsCaptain(false);
    setIsViceCaptain(false);
    setIsWebsiteVisible(true);
    setSortOrder("0");
    setRemarks("");
    setAssignStatus("ACTIVE");
    setAssignError(null);
    setAssignMessage(null);
  }

  const blockAssignBecauseActive =
    personContext?.squadMembership?.status === "ACTIVE";

  async function handleEnablePlayerCapacity() {
    if (!selectedPerson || !canManagePeople) {
      return;
    }

    setCapacityLoading(true);
    setAssignError(null);
    try {
      const updated = await enablePersonCapacity({
        personId: selectedPerson.id,
        capacity: "player",
      });
      setSelectedPerson(updated);
      setAssignMessage("Spieler-Kapazität aktiviert. Sie können die Person jetzt dem Kader hinzufügen.");
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
          : "Kaderänderungen sind für diese Team-Saison nicht möglich.",
      );
      return;
    }

    if (blockAssignBecauseActive) {
      setAssignError("Diese Person ist bereits im Kader dieser Saison.");
      return;
    }

    setAssignLoading(true);
    setAssignError(null);
    setAssignMessage(null);
    setRemoveError(null);

    try {
      const response = await fetch(
        `/api/teams/${teamId}/team-seasons/${teamSeason.id}/squad-members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: selectedPerson.id,
            status: assignStatus,
            shirtNumber: shirtNumber.trim(),
            positionLabel,
            isCaptain,
            isViceCaptain,
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
            "Spieler konnte dem Kader nicht hinzugefügt werden.",
          ),
        );
      }

      setAssignMessage(data?.message ?? "Spieler erfolgreich hinzugefügt.");
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
        `/api/teams/${teamId}/team-seasons/${teamSeason.id}/squad-members/${member.id}`,
        { method: "DELETE" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          mapRosterFetchErrorMessage(
            data?.error,
            "Spieler konnte nicht aus dem Kader entfernt werden.",
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

  const membershipHint = personContext?.squadMembership
    ? squadMembershipStatusHint(personContext.squadMembership.status)
    : null;

  return (
    <section
      id={sectionId}
      className={
        sectionId
          ? "scroll-mt-20 target:ring-2 target:ring-inset target:ring-[var(--sce-primary)]"
          : undefined
      }
      data-testid="team-squad-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Kader · {saisonLabel}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{playerCount} Spieler</p>
        </div>

        {canManage && seasonMutable && playerCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setAddSheetOpen(true)}
            data-testid="team-squad-add-button"
          >
            Spieler hinzufügen
          </Button>
        ) : null}
      </div>

      {!seasonMutable ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Diese Team-Saison ist nicht aktiv — Kaderänderungen sind hier nicht möglich.
        </p>
      ) : null}

      {allowedBirthYearsLabel ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Erlaubte Jahrgänge: {allowedBirthYearsLabel}
        </p>
      ) : null}

      <Sheet
        open={addSheetOpen}
        onClose={resetAddForm}
        title="Spieler hinzufügen"
        description={`Person dem Kader für ${saisonLabel} zuordnen.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={resetAddForm}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={assignLoading}
              disabled={
                !selectedPerson ||
                blockAssignBecauseActive ||
                blockAssignBecauseEligibility ||
                !seasonMutable
              }
              onClick={handleAssign}
              data-testid="team-squad-add-confirm"
            >
              {personContext?.squadMembership &&
              ["INACTIVE", "ARCHIVED"].includes(personContext.squadMembership.status)
                ? "Wieder zum Kader hinzufügen"
                : "Spieler hinzufügen"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">
            Bestehende Personen suchen und auswählen. Neue Personen erfassen Sie unter{" "}
            <Link href="/dashboard/persons" className="font-medium text-[var(--blue)] hover:underline">
              People & Access
            </Link>
            .
          </p>

          <PeoplePicker
            mode="player"
            teamSeasonId={teamSeason.id}
            excludeIds={activeSquadPersonIds}
            selected={selectedPerson}
            onSelect={setSelectedPerson}
            onClearSelected={() => setSelectedPerson(null)}
            placeholder="Suche nach Name oder Geburtsjahr…"
          />

          {selectedPerson ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3">
                <AdminAvatar name={getPersonName(selectedPerson)} size="md" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {getPersonName(selectedPerson)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Geburtsdatum: {formatBirthDate(selectedPerson.dateOfBirth) ?? "nicht gesetzt"}
                    {getBirthYear(selectedPerson.dateOfBirth)
                      ? ` · ${getBirthYear(selectedPerson.dateOfBirth)}`
                      : ""}
                  </p>
                </div>
              </div>

              {contextLoading ? (
                <p className="text-xs text-[var(--muted)]">Prüfe Kader-Status…</p>
              ) : null}
              {contextError ? (
                <p className="text-sm text-[var(--sce-danger)]">{contextError}</p>
              ) : null}

              {membershipHint ? (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)]">
                  {membershipHint}
                </p>
              ) : null}

              {selectedPersonEligibility ? (
                <TeamRosterEligibilityNotice presentation={selectedPersonEligibility} />
              ) : null}

              {personContext && !personContext.person.isPlayer ? (
                <div className={rosterContextNoticeClass}>
                  <p className="font-medium text-[var(--foreground)]">Keine Spieler-Kapazität</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Diese Person ist nicht als Spieler/in markiert und kann so nicht dem Kader
                    hinzugefügt werden.
                  </p>
                  {canManagePeople ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      loading={capacityLoading}
                      onClick={handleEnablePlayerCapacity}
                      data-testid="team-squad-enable-player-capacity"
                    >
                      Als Spieler aktivieren
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Bitte Kapazität unter People & Access anpassen (people.manage).
                    </p>
                  )}
                </div>
              ) : null}

              {personContext && personContext.otherActivePlayerSquads.length > 0 ? (
                <div className="text-xs text-[var(--muted)]">
                  <p className="font-medium text-[var(--text-2)]">Aktuell auch im Kader:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {personContext.otherActivePlayerSquads.map((row) => (
                      <li key={row.teamId}>
                        {row.teamName} ({row.seasonLabel})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!blockAssignBecauseActive &&
              !blockAssignBecauseEligibility &&
              personContext?.person.isPlayer !== false ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                      <span className={labelClass}>Rückennummer</span>
                      <input
                        type="number"
                        value={shirtNumber}
                        onChange={(event) => setShirtNumber(event.target.value)}
                        className={fieldClass}
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Position</span>
                      <input
                        type="text"
                        value={positionLabel}
                        onChange={(event) => setPositionLabel(event.target.value)}
                        className={fieldClass}
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

                  <div className="space-y-2">
                    <SwitchToggle
                      id="team-squad-add-captain"
                      label="Captain"
                      checked={isCaptain}
                      onChange={(checked) => {
                        setIsCaptain(checked);
                        if (checked) setIsViceCaptain(false);
                      }}
                    />
                    <SwitchToggle
                      id="team-squad-add-vice-captain"
                      label="Vize-Captain"
                      checked={isViceCaptain}
                      onChange={(checked) => {
                        setIsViceCaptain(checked);
                        if (checked) setIsCaptain(false);
                      }}
                    />
                    <SwitchToggle
                      id="team-squad-add-website-visible"
                      label="Auf Website anzeigen"
                      checked={isWebsiteVisible}
                      onChange={setIsWebsiteVisible}
                    />
                  </div>
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
        title="Spieler aus Kader entfernen"
        description={
          removeTarget
            ? `«${getPersonName(removeTarget.person)}» aus dem Kader ${saisonLabel} entfernen?`
            : ""
        }
        confirmLabel="Aus Kader entfernen"
        loading={removingMemberId != null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />

      {removeError ? (
        <p className="mt-3 text-sm font-medium text-[var(--sce-danger)]">{removeError}</p>
      ) : null}

      {playerCount === 0 ? (
        <div className="mt-4" data-testid="team-squad-empty">
          <p className="text-sm text-[var(--muted)]">
            Noch keine Spieler im Kader der Saison {saisonLabel}.
          </p>
          {canManage && seasonMutable ? (
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAddSheetOpen(true)}
              data-testid="team-squad-empty-add-button"
            >
              Spieler hinzufügen
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]" data-testid="team-squad-list">
          {teamSeason.playerSquadMembers.map((member) => (
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
                    {[
                      getBirthYear(member.person.dateOfBirth)?.toString() ?? null,
                      member.positionLabel ?? null,
                      member.shirtNumber ? `Nr. ${member.shirtNumber}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Keine Zusatzdaten"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusPill
                  label={member.status}
                  tone={member.status === "ACTIVE" ? "success" : "muted"}
                />
                {member.isCaptain ? (
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-2)]">
                    Captain
                  </span>
                ) : null}
                {member.isViceCaptain ? (
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-2)]">
                    Vice-Captain
                  </span>
                ) : null}
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
