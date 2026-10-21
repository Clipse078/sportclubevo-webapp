import { EventSource, EventType } from "@prisma/client";
import Link from "next/link";
import {
  createPlannerEntryAction,
  updatePlannerEntryAction,
} from "@/app/(admin)/dashboard/planner/actions";
import PlannerEntryDeleteButton from "@/components/admin/planner/PlannerEntryDeleteButton";
import PlannerEntryCreatePublicationFields from "@/components/admin/planner/PlannerEntryCreatePublicationFields";
import PlanningEditorOperationalWorkspace from "@/components/admin/shared/planning-editor/PlanningEditorOperationalWorkspace";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import { Button } from "@/components/ui/Button";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import { SceInformationSurface } from "@/components/sce/information/SceInformationSurface";
import { cn } from "@/lib/cn";

type PlannerCreateFormData = {
  seasons: Array<{
    id: string;
    key: string;
    name: string;
    isActive: boolean;
  }>;
  teams: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  selectedSeasonKey: string;
  selectedSeasonId: string;
  selectedType: EventType;
  backHref: string;
  eventId?: string;
  defaults?: {
    title: string;
    source: EventSource;
    teamId: string;
    location: string;
    startAt: string;
    endAt: string;
    opponentName: string;
    organizerName: string;
    competitionLabel: string;
    description: string;
    remarks: string;
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    trainingsplanVisible: boolean;
    teamPageVisible: boolean;
  };
};

type PlannerEntryCreateFormProps = {
  data: PlannerCreateFormData;
  mode?: "create" | "edit";
};

const TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "TRAINING", label: "Training" },
  { value: "MATCH", label: "Match" },
  { value: "TOURNAMENT", label: "Turnier" },
  { value: "OTHER", label: "Weiteres Event" },
  { value: "VACATION_PERIOD", label: "Ferienperiode" },
];

const SOURCE_OPTIONS: Array<{ value: EventSource; label: string }> = [
  { value: "MANUAL", label: "Manuell" },
  { value: "CLUBCORNER_FVNWS", label: "FVNWS API" },
  { value: "CSV_EXCEL_IMPORT", label: "CSV / Excel" },
  { value: "MUNICIPALITY_API", label: "Gemeinde API" },
];

function buildTypeHref(
  seasonKey: string,
  type: EventType,
  mode: "create" | "edit",
  eventId?: string,
) {
  const params = new URLSearchParams();

  if (seasonKey) {
    params.set("season", seasonKey);
  }

  params.set("type", type);

  if (mode === "edit" && eventId) {
    return `/dashboard/planner/edit/${eventId}?${params.toString()}`;
  }

  return `/dashboard/planner/new?${params.toString()}`;
}

export default function PlannerEntryCreateForm({
  data,
  mode = "create",
}: PlannerEntryCreateFormProps) {
  const defaults = data.defaults;
  const formAction =
    mode === "edit" ? updatePlannerEntryAction : createPlannerEntryAction;

  const primary = (
    <SceFeatureCard title="Stammdaten" testId="planner-create-stammdaten">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="fca-label" htmlFor="planner-title">
            Titel
          </label>
          <input
            id="planner-title"
            name="title"
            required
            defaultValue={defaults?.title ?? ""}
            className="fca-input mt-2 w-full"
            placeholder="Zum Beispiel Training E4"
          />
        </div>

        <div>
          <label className="fca-label">Saison</label>
          <input
            value={
              data.seasons.find((season) => season.key === data.selectedSeasonKey)?.name ?? ""
            }
            readOnly
            className="fca-input mt-2 w-full cursor-default bg-[var(--surface-2)]/60 text-[var(--text-2)]"
          />
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-source">
            Quelle
          </label>
          <select
            id="planner-source"
            name="source"
            defaultValue={defaults?.source ?? "MANUAL"}
            className="fca-input mt-2 w-full"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-team">
            Team
          </label>
          <select
            id="planner-team"
            name="teamId"
            defaultValue={defaults?.teamId ?? ""}
            className="fca-input mt-2 w-full"
          >
            <option value="">Kein Team</option>
            {data.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-location">
            Ort
          </label>
          <input
            id="planner-location"
            name="location"
            defaultValue={defaults?.location ?? ""}
            className="fca-input mt-2 w-full"
            placeholder="Zum Beispiel Hauptplatz"
          />
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-start">
            Start
          </label>
          <input
            id="planner-start"
            type="datetime-local"
            name="startAt"
            required
            defaultValue={defaults?.startAt ?? ""}
            className="fca-input mt-2 w-full"
          />
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-end">
            Ende
          </label>
          <input
            id="planner-end"
            type="datetime-local"
            name="endAt"
            defaultValue={defaults?.endAt ?? ""}
            className="fca-input mt-2 w-full"
          />
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-opponent">
            Gegner
          </label>
          <input
            id="planner-opponent"
            name="opponentName"
            defaultValue={defaults?.opponentName ?? ""}
            className="fca-input mt-2 w-full"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="fca-label" htmlFor="planner-organizer">
            Organisator
          </label>
          <input
            id="planner-organizer"
            name="organizerName"
            defaultValue={defaults?.organizerName ?? ""}
            className="fca-input mt-2 w-full"
            placeholder="Optional"
          />
        </div>

        <div className="md:col-span-2">
          <label className="fca-label" htmlFor="planner-competition">
            Wettbewerb / Label
          </label>
          <input
            id="planner-competition"
            name="competitionLabel"
            defaultValue={defaults?.competitionLabel ?? ""}
            className="fca-input mt-2 w-full"
            placeholder="Zum Beispiel BRACK.CH PlayMore"
          />
        </div>

        <div className="md:col-span-2">
          <label className="fca-label" htmlFor="planner-description">
            Beschreibung
          </label>
          <textarea
            id="planner-description"
            name="description"
            rows={4}
            defaultValue={defaults?.description ?? ""}
            className="fca-input mt-2 w-full min-h-[6rem] py-3"
            placeholder="Optionale Beschreibung"
          />
        </div>

        <div className="md:col-span-2">
          <label className="fca-label" htmlFor="planner-remarks">
            Bemerkungen
          </label>
          <textarea
            id="planner-remarks"
            name="remarks"
            rows={3}
            defaultValue={defaults?.remarks ?? ""}
            className="fca-input mt-2 w-full min-h-[5rem] py-3"
            placeholder="Interne Bemerkungen"
          />
        </div>
      </div>
    </SceFeatureCard>
  );

  const secondaryRail = (
    <>
      <PlanningPublicationPanel>
        <PlannerEntryCreatePublicationFields
          eventType={data.selectedType}
          defaults={{
            websiteVisible: defaults?.websiteVisible,
            wochenplanVisible: defaults?.wochenplanVisible,
            infoboardVisible: defaults?.infoboardVisible,
            homepageVisible: defaults?.homepageVisible,
            trainingsplanVisible: defaults?.trainingsplanVisible,
            teamPageVisible: defaults?.teamPageVisible,
          }}
        />
      </PlanningPublicationPanel>

      <SceFeatureCard title="Aktion" testId="planner-create-actions">
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary">
            {mode === "edit" ? "Änderungen speichern" : "Planner-Eintrag erstellen"}
          </Button>
          <Link href={data.backHref} className="fca-button-secondary inline-flex h-10 items-center px-4">
            Abbrechen
          </Link>
          {mode === "edit" && data.eventId ? (
            <PlannerEntryDeleteButton eventId={data.eventId} seasonKey={data.selectedSeasonKey} />
          ) : null}
        </div>
      </SceFeatureCard>
    </>
  );

  return (
    <div className="space-y-6">
      <SceInformationSurface variant="flat" testId="planner-entry-type-surface">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Eintragstyp
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => {
            const isSelected = option.value === data.selectedType;
            return (
              <Link
                key={option.value}
                href={buildTypeHref(
                  data.selectedSeasonKey,
                  option.value,
                  mode,
                  data.eventId,
                )}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  isSelected
                    ? "border-[var(--sce-primary)]/40 bg-[var(--sce-primary)]/10 font-semibold text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                )}
                aria-current={isSelected ? "page" : undefined}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </SceInformationSurface>

      <form action={formAction} className="space-y-6">
        {mode === "edit" && data.eventId ? (
          <input type="hidden" name="eventId" value={data.eventId} />
        ) : null}
        <input type="hidden" name="seasonId" value={data.selectedSeasonId} />
        <input type="hidden" name="seasonKey" value={data.selectedSeasonKey} />
        <input type="hidden" name="type" value={data.selectedType} />

        <PlanningEditorOperationalWorkspace primary={primary} secondaryRail={secondaryRail} />
      </form>
    </div>
  );
}
