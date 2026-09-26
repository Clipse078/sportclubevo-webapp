"use client";

import { useState } from "react";
import { SceIcon } from "../SceIcon";
import {
  SCE_ICON_REGISTRY,
  type SceIconRegistryName,
} from "../registry";
import type { SceIconSize } from "../SceIcon.types";
import type {
  SceApprovedMasterIconName,
  SceApprovedAnalyticsWorkflowMasterIconName,
  SceApprovedFinalSemanticMasterIconName,
  SceApprovedFinanceCommercialMasterIconName,
  SceApprovedPeopleOperationsMasterIconName,
  SceApprovedPlatformMasterIconName,
} from "../masters/approved-hero-meta";

/** Production optical QA sizes (SCE-ICONS-V2-01). */
export const SCE_SPECIMEN_OPTICAL_SIZES = [16, 18, 20, 24, 28, 32, 48, 64] as const;

const HERO_SIZES: readonly (SceIconSize | number)[] = SCE_SPECIMEN_OPTICAL_SIZES;

const CORE_MASTERS: SceApprovedMasterIconName[] = [
  "dashboard",
  "week-planner",
  "training",
  "match",
  "tournament",
];

const SPORT_MASTERS: SceApprovedMasterIconName[] = [
  "team",
  "season",
  "standings",
  "results",
  "attendance",
  "pitch",
  "dressing-room",
];

const PEOPLE_OPERATIONS_MASTERS: SceApprovedPeopleOperationsMasterIconName[] = [
  "player",
  "coach",
  "guardian-parent",
  "member",
  "contact",
  "invitation",
  "assignment",
  "availability",
  "absence",
  "check-in",
  "facility",
  "team-management",
  "committee-board",
  "volunteer",
  "sponsor",
  "partner",
];

const PUBLISHING_PLATFORM_MASTERS: SceApprovedPlatformMasterIconName[] = [
  "news",
  "notifications",
  "website",
  "infoboard",
  "publish",
  "planning",
  "resource-allocation",
  "conflict",
  "attention",
  "audit",
  "settings",
  "billing-invoice",
];

const FINAL_SEMANTIC_MASTERS: SceApprovedFinalSemanticMasterIconName[] = [
  "competition",
  "page",
  "media-library",
  "block-library",
  "website-navigation",
  "homepage-builder",
  "goal",
  "initiative",
  "material-inventory",
  "discipline-incident",
  "target-group",
  "waiting-list",
];

const ANALYTICS_WORKFLOW_MASTERS: SceApprovedAnalyticsWorkflowMasterIconName[] = [
  "analytics",
  "report",
  "insight",
  "form",
  "approval",
  "workflow",
  "automation",
  "integration",
  "import",
  "export",
  "archive",
  "history",
];

const FINANCE_COMMERCIAL_MASTERS: SceApprovedFinanceCommercialMasterIconName[] = [
  "booking",
  "facility-booking",
  "payment",
  "transaction",
  "finance",
  "budget",
  "expense",
  "revenue",
  "subscription",
  "contract",
  "sponsorship-management",
  "business-club",
  "receipt",
  "qr-invoice",
  "commercial-account",
  "cost-centre",
];

const ORGANISATION_MASTERS: SceApprovedMasterIconName[] = [
  "organisation",
  "org-unit",
  "people",
  "roles-access",
  "club",
  "documents",
  "tasks",
  "requirements",
  "events",
  "communication",
];

const MASTER_LABELS: Record<SceApprovedMasterIconName, string> = {
  dashboard: "Dashboard",
  "week-planner": "Wochenplaner",
  training: "Training",
  match: "Spiele — Open VS",
  tournament: "Turniere",
  team: "Team",
  season: "Season / Saison",
  standings: "Standings / Rangliste",
  results: "Results / Resultate",
  attendance: "Attendance / Aufgebot",
  pitch: "Pitch / Spielfeld",
  "dressing-room": "Dressing Room / Garderobe",
  organisation: "Organisation",
  "org-unit": "Org Unit",
  people: "People / Personen",
  "roles-access": "Roles & Access",
  club: "Club",
  documents: "Documents / Dokumente",
  tasks: "Tasks / Aufgaben",
  requirements: "Requirements / Anforderungen",
  events: "Events / Veranstaltungen",
  communication: "Communication",
  attention: "Attention / Needs action",
  audit: "Audit / Audit log",
  "billing-invoice": "Billing / Invoice",
  conflict: "Conflict",
  infoboard: "Infoboard",
  news: "News",
  notifications: "Notifications",
  planning: "Planning",
  publish: "Publish",
  "resource-allocation": "Resource Allocation",
  settings: "Settings",
  website: "Website",
  absence: "Absence / Unavailable",
  assignment: "Assignment / Zuweisung",
  availability: "Availability / Available",
  "check-in": "Check-in / Arrival",
  coach: "Coach / Trainer",
  "committee-board": "Committee / Board",
  contact: "Contact / Kontakt",
  facility: "Facility / Anlage",
  "guardian-parent": "Guardian / Parent",
  invitation: "Invitation / Einladung",
  member: "Member / Mitglied",
  partner: "Partner",
  player: "Player / Spieler",
  sponsor: "Sponsor / Sponsoring",
  "team-management": "Team Management",
  volunteer: "Volunteer / Helfer",
  booking: "Booking",
  "facility-booking": "Facility Booking",
  payment: "Payment",
  transaction: "Transaction",
  finance: "Finance",
  budget: "Budget",
  expense: "Expense",
  revenue: "Revenue",
  subscription: "Subscription",
  contract: "Contract",
  "sponsorship-management": "Sponsorship Management",
  "business-club": "Business Club",
  receipt: "Receipt",
  "qr-invoice": "QR Invoice",
  "commercial-account": "Commercial Account",
  "cost-centre": "Cost Centre",
  analytics: "Analytics",
  report: "Report",
  insight: "Insight",
  form: "Form",
  approval: "Approval",
  workflow: "Workflow",
  automation: "Automation",
  integration: "Integration",
  import: "Import",
  export: "Export",
  archive: "Archive",
  history: "History",
  competition: "Competition / Wettkämpfe",
  page: "Page / CMS Seite",
  "media-library": "Media Library / Mediathek",
  "block-library": "Block Library",
  "website-navigation": "Website Navigation",
  "homepage-builder": "Homepage Builder",
  goal: "Goal / Ziele",
  initiative: "Initiative / Initiativen",
  "material-inventory": "Material & Inventory",
  "discipline-incident": "Discipline Incident",
  "target-group": "Target Group / Zielgruppen",
  "waiting-list": "Waiting List / Warteliste",
};

/** V2 canonical — domain masters inherit contextual color via currentColor (same geometry all tiers). */
const V2_MONOCHROME_CLASS = "text-current";

const STATE_PREVIEW = [
  { id: "DEFAULT", className: "text-[var(--foreground)]" },
  { id: "MUTED", className: "text-[var(--muted)]" },
  { id: "ACTIVE", className: "text-[var(--sce-accent)]" },
  { id: "SUCCESS", className: "text-[var(--sce-success)]" },
  { id: "WARNING", className: "text-[var(--sce-warning)]" },
  { id: "ERROR", className: "text-[var(--sce-danger)]" },
  { id: "INFO", className: "text-[var(--sce-info)]" },
  { id: "DISABLED", className: "text-[var(--muted)] opacity-50" },
] as const;

function SizeRow({
  name,
  sizes,
  theme,
  monochromePreview,
}: {
  name: SceApprovedMasterIconName;
  sizes: readonly (SceIconSize | number)[];
  theme: "original" | "light" | "monochrome-dark" | "monochrome-light";
  monochromePreview?: boolean;
}) {
  const surface =
    theme === "original"
      ? "rounded-lg bg-[#0b1524] px-4 py-3"
      : theme === "light"
        ? "sce-theme-light rounded-lg bg-[#f1f5f9] px-4 py-3"
        : theme === "monochrome-dark"
          ? `rounded-lg bg-[#0b1524] px-4 py-3 text-[#e2e8f0] ${V2_MONOCHROME_CLASS}`
          : `sce-theme-light rounded-lg bg-[#f1f5f9] px-4 py-3 text-[#0f172a] ${V2_MONOCHROME_CLASS}`;

  const label =
    theme === "original"
      ? "SCE Original"
      : theme === "light"
        ? "SCE Light"
        : theme === "monochrome-dark"
          ? "Monochrome — dark"
          : "Monochrome — light";

  return (
    <div className={`flex flex-wrap items-center gap-4 ${surface}`}>
      <span className="w-32 shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
        {monochromePreview ? " (preview)" : ""}
      </span>
      {sizes.map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <SceIcon name={name} size={size} />
          <span className="text-[10px] tabular-nums text-[var(--muted)]">{size}px</span>
        </div>
      ))}
    </div>
  );
}

function MasterIconCard({
  name,
  showMonochromePreview,
}: {
  name: SceApprovedMasterIconName;
  showMonochromePreview: boolean;
}) {
  const meta = SCE_ICON_REGISTRY[name];
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <header className="mb-4 border-b border-[var(--border)] pb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{MASTER_LABELS[name]}</h3>
        <p className="mt-1 font-mono text-xs text-[var(--text-2)]">
          {name} · {meta.viewBox ?? "0 0 24 24"}
        </p>
      </header>
      <div className="space-y-3">
        <SizeRow name={name} sizes={HERO_SIZES} theme="original" />
        <SizeRow name={name} sizes={HERO_SIZES} theme="light" />
        {showMonochromePreview ? (
          <>
            <SizeRow
              name={name}
              sizes={HERO_SIZES}
              theme="monochrome-dark"
              monochromePreview
            />
            <SizeRow
              name={name}
              sizes={HERO_SIZES}
              theme="monochrome-light"
              monochromePreview
            />
          </>
        ) : null}
      </div>
    </article>
  );
}

function MasterSection({
  title,
  description,
  names,
  showMonochromePreview,
}: {
  title: string;
  description: string;
  names: SceApprovedMasterIconName[];
  showMonochromePreview: boolean;
}) {
  return (
    <section className="mb-12 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-2)]">{description}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {names.map((name) => (
          <MasterIconCard
            key={name}
            name={name}
            showMonochromePreview={showMonochromePreview}
          />
        ))}
      </div>
    </section>
  );
}

export function SceIconSpecimen() {
  const [monochromePreview, setMonochromePreview] = useState(true);
  const provisionalNames = (Object.keys(SCE_ICON_REGISTRY) as SceIconRegistryName[]).filter(
    (name) => SCE_ICON_REGISTRY[name].geometrySource !== "approved-master",
  );

  const allApprovedMasters: SceApprovedMasterIconName[] = [
    ...CORE_MASTERS,
    ...SPORT_MASTERS,
    ...ORGANISATION_MASTERS,
    ...PUBLISHING_PLATFORM_MASTERS,
    ...PEOPLE_OPERATIONS_MASTERS,
    ...FINANCE_COMMERCIAL_MASTERS,
    ...ANALYTICS_WORKFLOW_MASTERS,
    ...FINAL_SEMANTIC_MASTERS,
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 text-[var(--foreground)]">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">SCE Icon System — Specimen</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-2)]">
          Internal development surface for the <strong>V2 canonical</strong> SCE icon family — 90
          approved monochrome masters at 16–64px on dark/light surfaces. Domain geometry uses{" "}
          <code className="text-xs">currentColor</code>; surrounding UI owns state/emphasis (
          <code className="text-xs">components/design-system/icons/v2/SCE_ICON_V2_DESIGN_CONTRACT.md</code>
          ). V1 multicolour artwork remains historical baseline only.
        </p>
        <label className="mt-4 flex max-w-md cursor-pointer items-center gap-2 text-sm text-[var(--text-2)]">
          <input
            type="checkbox"
            checked={monochromePreview}
            onChange={(e) => setMonochromePreview(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          Monochrome preview mode (silhouette assessment)
        </label>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {allApprovedMasters.length} approved masters · sizes{" "}
          {SCE_SPECIMEN_OPTICAL_SIZES.join(", ")}px
        </p>
      </header>

      <MasterSection
        title="Section 1 — SCE Core (Approved Masters)"
        description="Primary planning cockpit and activity masters, including Open VS for matches."
        names={CORE_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 2 — Sport & Competition"
        description="Sport-neutral competition and resource masters for teams, seasons, standings, and facilities."
        names={SPORT_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 3 — Organisation & Work"
        description="Organisation structure, people, access, club identity, and operational work surfaces."
        names={ORGANISATION_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 4 — Publishing & Platform"
        description="Publishing, public channels, platform administration, and planning governance masters (SCE-ICONS-05 Batch 2)."
        names={PUBLISHING_PLATFORM_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 5 — People, Membership & Club Operations"
        description="People identities, membership, participation, facilities, and club operations masters (SCE-ICONS-06 Batch 3)."
        names={PEOPLE_OPERATIONS_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 6 — Finance & Commercial Operations"
        description="Facilities booking, finance, billing, commercial accounts, and commercial operations masters (SCE-ICONS-07 Batch 4)."
        names={FINANCE_COMMERCIAL_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 7 — Analytics, Reporting & Workflow"
        description="Analytics, reporting, workflow, automation, integration, and data lifecycle masters (SCE-ICONS-08 Batch 5)."
        names={ANALYTICS_WORKFLOW_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <MasterSection
        title="Section 8 — Final semantic masters"
        description="SCE-ICONS-12 / SCE-ICONS-13 — last approved domain semantics (competition, CMS surfaces, club development, governance)."
        names={FINAL_SEMANTIC_MASTERS}
        showMonochromePreview={monochromePreview}
      />

      <section className="mb-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">V2 state ownership (STATE_PREVIEW)</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-2)]">
          Same master geometry across semantic UI states — color is never baked into domain masters.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {STATE_PREVIEW.map((state) => (
            <div
              key={state.id}
              className={`flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] px-4 py-3 ${state.className}`}
            >
              <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide">
                {state.id}
              </span>
              <SceIcon name="dashboard" size={24} />
              <SceIcon name="training" size={24} />
              <SceIcon name="website" size={24} />
              <SceIcon name="finance" size={24} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Provisional registry entries ({provisionalNames.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 pl-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 px-3 text-center">20px</th>
                <th className="py-2 px-3 text-center">Light 20px</th>
              </tr>
            </thead>
            <tbody>
              {provisionalNames.map((name) => (
                <tr key={name} className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4 pl-4 font-mono text-xs text-[var(--text-2)]">{name}</td>
                  <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                    {SCE_ICON_REGISTRY[name].category}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <SceIcon name={name} size={20} />
                  </td>
                  <td className="py-3 px-3 text-center sce-theme-light rounded-md bg-[#f1f5f9]">
                    <SceIcon name={name} size={20} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
