"use client";

/**
 * PERSON-UX-01 — Person Workspace tab shell.
 * PERSON-UX-02 — Capacity-aware tab visibility.
 * PERSON-UX-03 — Domain-permission-aware tab visibility.
 * PERSON-UX-07 — Profile & capacity flags drive role-specific workspace tabs.
 * PERSON-UX-08 — Dokumente tab: fully implemented (no longer deferred).
 *
 * Workspace tabs:
 *   Übersicht · Stammdaten · Organisation
 *   · [Spieler]             — visible iff person.isPlayer is true
 *   · [Trainer]             — visible iff person.isTrainer is true
 *   · [Sport & Entwicklung] — visible iff isPlayer OR isTrainer (OR relationship evidence)
 *   · Mitgliedschaft
 *   · [Finanzen]            — visible iff viewer holds people.finance.view
 *   · [Gesundheit]          — visible iff viewer holds people.health.view
 *   · [Dokumente]           — visible iff viewer holds people.private_documents.view
 *   · Zugang
 *
 * PERSON-UX-07 Capacity model:
 *   Tab visibility for Spieler and Trainer is driven by the explicit capacity
 *   flags (person.isPlayer, person.isTrainer), NOT solely by membership evidence.
 *   Removing a capacity flag hides the tab but does NOT delete historical data.
 *   Multiple capacities may be true simultaneously — tabs for each are shown.
 *   Custom functions (Weitere Funktion) do NOT generate dedicated tabs.
 *
 * Authorization model (PERSON-UX-03):
 *   Sensitive domain tabs require viewer domain permissions. Absent → no tab,
 *   no placeholder, no hint about the domain's existence. Fail-closed.
 *
 * Capacity ≠ Assignment ≠ Authorization:
 *   isPlayer=true means "this Person has a player profile".
 *   It does NOT grant team assignment or assessment permissions automatically.
 *
 * IMPORTANT: Do NOT hardcode role names. Only permission keys may appear here.
 *
 * Simultaneous capacities are always first-class: a Person may hold Spieler +
 * Trainer + Funktionär at once. No single "primary" capacity is selected.
 */

import { useMemo } from "react";
import { HeartPulse } from "lucide-react";
import { FinanceSceIcon } from "@/components/icons/domain-sce-icon-components";
import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { useContextDetailTab } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildPersonWorkspaceTabNavigationConfig,
  type PersonWorkspaceTabId,
} from "@/lib/people/person-workspace-tab-config";
import type { PersonAssignment, PersonDetail, PersonSquadMembership, PersonTrainerMembership, PersonMembershipRecord, PersonAssessmentRecord, PersonDocumentItem, TenantCriterion } from "@/lib/people/queries";
import type { PersonAccessRole, PersonAccessLinkedUser } from "./PersonAccessRolesCard";
import type { PersonDomainPermissions } from "@/lib/people/person-domain-auth";
import { resolvePersonCapacities } from "@/lib/people/capacity";
import PersonWorkspaceOverviewTab from "./PersonWorkspaceOverviewTab";
import PersonAssignmentsTab from "./PersonAssignmentsTab";
import PersonContactTab from "./PersonContactTab";
import PersonSpielerTab from "./PersonSpielerTab";
import PersonTrainerTab from "./PersonTrainerTab";
import PersonSportTab from "./PersonSportTab";
import PersonZugangTab from "./PersonZugangTab";
import PersonDomainPlaceholder from "./PersonDomainPlaceholder";
import PersonMembershipTab from "./PersonMembershipTab";
import PersonDocumentTab from "./PersonDocumentTab";

type PersonDetailTabsProps = {
  person: PersonDetail & {
    assignments: PersonAssignment[];
    squadMemberships: PersonSquadMembership[];
    trainerMemberships: PersonTrainerMembership[];
    // PERSON-UX-07: capacity flags must be present on person object
    isPlayer: boolean;
    isTrainer: boolean;
  };
  canManage: boolean;
  canDelete: boolean;
  orgUnits: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; shortName?: string | null }>;
  activeSeason: { id: string; name: string; key: string } | null;
  accessRolesCard: {
    linkedUser: PersonAccessLinkedUser | null;
    isActiveTenantMember: boolean;
    roles: PersonAccessRole[];
    assignedRoleIds: string[];
    canAssign: boolean;
  } | null;
  /**
   * Sensitive domain access flags resolved server-side.
   * Determines which domain tabs are rendered for this viewer.
   * Defaults to all-denied when absent (fail-closed).
   */
  domainPermissions?: PersonDomainPermissions;
  /** PERSON-UX-04: Club membership records, newest first. */
  memberships?: PersonMembershipRecord[];
  /** PERSON-UX-05: Development assessments, newest first. Pre-fetched server-side. */
  assessments?: PersonAssessmentRecord[];
  /** PERSON-UX-05: Active criteria for assessment forms. */
  criteria?: TenantCriterion[];
  /**
   * PERSON-UX-07: Pre-fetched PersonDocuments (metadata only; no storage URLs).
   * Only populated when viewer holds people.private_documents.view permission.
   */
  documents?: PersonDocumentItem[];
};

export default function PersonDetailTabs({
  person,
  canManage,
  canDelete,
  orgUnits,
  teams,
  activeSeason,
  accessRolesCard,
  domainPermissions,
  memberships = [],
  assessments = [],
  criteria = [],
  documents = [] }: PersonDetailTabsProps) {
  // ── Capacity resolution ────────────────────────────────────────────────────
  // PERSON-UX-07: Spieler / Trainer tab visibility is driven by explicit
  // capacity flags. Membership evidence is used as a secondary signal for the
  // Sport & Entwicklung cross-view tab and for content within the Spieler/Trainer tabs.
  const capacities = resolvePersonCapacities(
    person.squadMemberships,
    person.trainerMemberships,
  );

  // Primary capacity flags (PERSON-UX-07)
  const showSpielerTab = person.isPlayer === true;
  const showTrainerTab = person.isTrainer === true;
  // Sport & Entwicklung: visible when either capacity is active OR there is
  // any sporting membership evidence (preserves cross-role biography value).
  const showSportTab = showSpielerTab || showTrainerTab || capacities.hasSportingEvidence;

  // ── Domain permission flags ─────────────────────────────────────────────
  // Fail-closed: if domainPermissions is not provided, all sensitive tabs
  // are hidden. This matches the fail-closed design of the RPERM system.
  const canViewFinance              = domainPermissions?.canViewFinance ?? false;
  const canViewHealth               = domainPermissions?.canViewHealth ?? false;
  const canViewPrivateDocuments     = domainPermissions?.canViewPrivateDocuments ?? false;
  const canManagePrivateDocuments   = domainPermissions?.canManagePrivateDocuments ?? false;
  const canViewDevelopment          = domainPermissions?.canViewDevelopment ?? false;
  const canViewAssessments          = domainPermissions?.canViewAssessments ?? false;
  const canManageAssessments        = domainPermissions?.canManageAssessments ?? false;
  const canViewContact              = domainPermissions?.canViewContact ?? false;
  const canManageContact            = domainPermissions?.canManageContact ?? false;

  // ── Counts for badges ──────────────────────────────────────────────────────
  const activeAssignmentCount = person.assignments.filter(
    (a: PersonAssignment) => a.status === "ACTIVE",
  ).length;
  // Active squad (ACTIVE | INJURED | ABSENT) + active trainer roles
  const activeSportingRoleCount =
    person.squadMemberships.filter((m: PersonSquadMembership) =>
      (["ACTIVE", "INJURED", "ABSENT"] as string[]).includes(m.status),
    ).length +
    person.trainerMemberships.filter((m: PersonTrainerMembership) => m.status === "ACTIVE").length;

  const tabConfig = useMemo(
    () =>
      buildPersonWorkspaceTabNavigationConfig({
        showSpielerTab,
        showTrainerTab,
        showSportTab,
        canViewFinance,
        canViewHealth,
        canViewPrivateDocuments,
        organisationCount:
          activeAssignmentCount > 0 ? activeAssignmentCount : undefined,
        sportRoleCount:
          activeSportingRoleCount > 0 ? activeSportingRoleCount : undefined,
      }),
    [
      activeAssignmentCount,
      activeSportingRoleCount,
      canViewFinance,
      canViewHealth,
      canViewPrivateDocuments,
      showSpielerTab,
      showSportTab,
      showTrainerTab,
    ],
  );

  const { activeTab, navigateToTab } = useContextDetailTab(tabConfig);
  const safeActiveTab: PersonWorkspaceTabId = activeTab;

  const navigateToPersonTab = (tab: PersonWorkspaceTabId) => {
    navigateToTab(tab);
  };

  return (
    <div className="space-y-0">
      <SceContextTabs
        config={tabConfig}
        ariaLabel="Person Workspace"
        testId="person-detail-tabs"
        idPrefix="person-tab"
      />

      {/* Tab panels — only active tab content is mounted */}
      <div className="pt-6">
        {/* Übersicht */}
        <div
          role="tabpanel"
          id="tabpanel-uebersicht"
          aria-labelledby="tab-uebersicht"
          hidden={safeActiveTab !== "uebersicht"}
        >
          {safeActiveTab === "uebersicht" ? (
            <PersonWorkspaceOverviewTab
              person={person}
              activeSeason={activeSeason}
              onNavigateToTab={navigateToPersonTab}
              documentCount={canViewPrivateDocuments ? documents.length : null}
              canManage={canManage}
            />
          ) : null}
        </div>

        {/* Stammdaten */}
        <div
          role="tabpanel"
          id="tabpanel-stammdaten"
          aria-labelledby="tab-stammdaten"
          hidden={safeActiveTab !== "stammdaten"}
        >
          {safeActiveTab === "stammdaten" ? (
            <PersonContactTab
              person={person}
              canManage={canManage}
              canDelete={canDelete}
              canViewContact={canViewContact}
              canManageContact={canManageContact}
            />
          ) : null}
        </div>

        {/* Organisation */}
        <div
          role="tabpanel"
          id="tabpanel-organisation"
          aria-labelledby="tab-organisation"
          hidden={safeActiveTab !== "organisation"}
        >
          {safeActiveTab === "organisation" ? (
            <PersonAssignmentsTab
              personId={person.id}
              assignments={person.assignments}
              canManage={canManage}
              orgUnits={orgUnits}
              teams={teams}
              activeSeason={activeSeason}
            />
          ) : null}
        </div>

        {/* Spieler — only rendered when isPlayer capacity is active (PERSON-UX-07) */}
        {showSpielerTab ? (
          <div
            role="tabpanel"
            id="tabpanel-spieler"
            aria-labelledby="tab-spieler"
            hidden={safeActiveTab !== "spieler"}
          >
            {safeActiveTab === "spieler" ? (
              <PersonSpielerTab
                squadMemberships={person.squadMemberships}
                assignments={person.assignments}
                activeSeason={activeSeason}
                personId={person.id}
                canViewDevelopment={canViewDevelopment}
                canViewAssessments={canViewAssessments}
                canManageAssessments={canManageAssessments}
                assessments={assessments}
                criteria={criteria}
                onNavigateToTab={navigateToPersonTab}
              />
            ) : null}
          </div>
        ) : null}

        {/* Trainer — only rendered when isTrainer capacity is active (PERSON-UX-07) */}
        {showTrainerTab ? (
          <div
            role="tabpanel"
            id="tabpanel-trainer"
            aria-labelledby="tab-trainer"
            hidden={safeActiveTab !== "trainer"}
          >
            {safeActiveTab === "trainer" ? (
              <PersonTrainerTab
                trainerMemberships={person.trainerMemberships}
                assignments={person.assignments}
                activeSeason={activeSeason}
                personFirstName={person.firstName}
                onNavigateToTab={navigateToPersonTab}
              />
            ) : null}
          </div>
        ) : null}

        {/* Sport & Entwicklung — cross-role biography visible when any sporting capacity/evidence */}
        {showSportTab ? (
          <div
            role="tabpanel"
            id="tabpanel-sport"
            aria-labelledby="tab-sport"
            hidden={safeActiveTab !== "sport"}
          >
            {safeActiveTab === "sport" ? (
              <PersonSportTab
                personId={person.id}
                squadMemberships={person.squadMemberships}
                trainerMemberships={person.trainerMemberships}
                assignments={person.assignments}
                canViewDevelopment={canViewDevelopment}
                canViewAssessments={canViewAssessments}
                canManageAssessments={canManageAssessments}
                assessments={assessments}
                criteria={criteria}
                onNavigateToTab={navigateToPersonTab}
              />
            ) : null}
          </div>
        ) : null}

        {/* Mitgliedschaft — PERSON-UX-04: real implementation */}
        <div
          role="tabpanel"
          id="tabpanel-mitgliedschaft"
          aria-labelledby="tab-mitgliedschaft"
          hidden={safeActiveTab !== "mitgliedschaft"}
        >
          {safeActiveTab === "mitgliedschaft" ? (
            <PersonMembershipTab
              personId={person.id}
              memberships={memberships}
              canManage={canManage}
            />
          ) : null}
        </div>

        {/* Finanzen — rendered only when viewer holds people.finance.view */}
        {canViewFinance ? (
          <div
            role="tabpanel"
            id="tabpanel-finanzen"
            aria-labelledby="tab-finanzen"
            hidden={safeActiveTab !== "finanzen"}
          >
            {safeActiveTab === "finanzen" ? (
              <PersonDomainPlaceholder
                icon={<FinanceSceIcon className="h-6 w-6" />}
                title="Finanzen"
                description="Beitrags- und Rechnungsdaten folgen dem Pfad:
                  Person → Mitgliedschaft → Beitragspflicht → Rechnung → Zahlung.
                  Dieses Modul erfordert ein separates Buchhaltungssystem und wird
                  nicht direkt in die Person integriert."
                plannedFor="PERSON-UX-0x (Finanzen)"
              />
            ) : null}
          </div>
        ) : null}

        {/* Gesundheit — rendered only when viewer holds people.health.view */}
        {canViewHealth ? (
          <div
            role="tabpanel"
            id="tabpanel-gesundheit"
            aria-labelledby="tab-gesundheit"
            hidden={safeActiveTab !== "gesundheit"}
          >
            {safeActiveTab === "gesundheit" ? (
              <PersonDomainPlaceholder
                icon={<HeartPulse className="h-6 w-6" />}
                title="Gesundheit"
                description="Medizinische Informationen (Erkrankungen, Allergien, Notfallkontakte)
                  werden in einem späteren Modul mit dedizierter Feinabstufung der Zugriffsrechte
                  implementiert."
                plannedFor="PERSON-UX-0x (Gesundheit)"
              />
            ) : null}
          </div>
        ) : null}

        {/* Dokumente — Person-bound. Visible iff viewer holds people.private_documents.view. */}
        {/* PERSON-UX-07: tab is ALWAYS person-bound (not capacity-dependent). */}
        {canViewPrivateDocuments ? (
          <div
            role="tabpanel"
            id="tabpanel-dokumente"
            aria-labelledby="tab-dokumente"
            hidden={safeActiveTab !== "dokumente"}
          >
            {safeActiveTab === "dokumente" ? (
              <PersonDocumentTab
                personId={person.id}
                initialDocuments={documents}
                canManage={canManagePrivateDocuments}
              />
            ) : null}
          </div>
        ) : null}

        {/* Zugang */}
        <div
          role="tabpanel"
          id="tabpanel-zugang"
          aria-labelledby="tab-zugang"
          hidden={safeActiveTab !== "zugang"}
        >
          {safeActiveTab === "zugang" ? (
            <PersonZugangTab
              personId={person.id}
              accessRolesCard={accessRolesCard}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
