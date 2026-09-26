"use client";

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

const HERO_SIZES: SceIconSize[] = [16, 20, 24, 32, 48];

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

function SizeRow({
  name,
  sizes,
  theme,
}: {
  name: SceApprovedMasterIconName;
  sizes: SceIconSize[];
  theme: "original" | "light";
}) {
  const surface =
    theme === "original"
      ? "rounded-lg bg-[#0b1524] px-4 py-3"
      : "sce-theme-light rounded-lg bg-[#f1f5f9] px-4 py-3";

  return (
    <div className={`flex flex-wrap items-center gap-4 ${surface}`}>
      <span className="w-28 shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {theme === "original" ? "SCE Original" : "SCE Light"}
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

function MasterIconCard({ name }: { name: SceApprovedMasterIconName }) {
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
      </div>
    </article>
  );
}

function MasterSection({
  title,
  description,
  names,
}: {
  title: string;
  description: string;
  names: SceApprovedMasterIconName[];
}) {
  return (
    <section className="mb-12 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-2)]">{description}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {names.map((name) => (
          <MasterIconCard key={name} name={name} />
        ))}
      </div>
    </section>
  );
}

export function SceIconSpecimen() {
  const provisionalNames = (Object.keys(SCE_ICON_REGISTRY) as SceIconRegistryName[]).filter(
    (name) => SCE_ICON_REGISTRY[name].geometrySource !== "approved-master",
  );

  return (
    <div className="mx-auto max-w-5xl p-6 text-[var(--foreground)]">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">SCE Icon System — Specimen</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-2)]">
          Internal development surface for SCE icon approved masters. Approved masters render committed
          64×64 vector geometry via <code className="text-xs">SceIcon</code>; provisional registry
          entries remain listed for inventory review.
        </p>
      </header>

      <MasterSection
        title="Section 1 — SCE Core (Approved Masters)"
        description="Primary planning cockpit and activity masters, including Open VS for matches."
        names={CORE_MASTERS}
      />

      <MasterSection
        title="Section 2 — Sport & Competition"
        description="Sport-neutral competition and resource masters for teams, seasons, standings, and facilities."
        names={SPORT_MASTERS}
      />

      <MasterSection
        title="Section 3 — Organisation & Work"
        description="Organisation structure, people, access, club identity, and operational work surfaces."
        names={ORGANISATION_MASTERS}
      />

      <MasterSection
        title="Section 4 — Publishing & Platform"
        description="Publishing, public channels, platform administration, and planning governance masters (SCE-ICONS-05 Batch 2)."
        names={PUBLISHING_PLATFORM_MASTERS}
      />

      <MasterSection
        title="Section 5 — People, Membership & Club Operations"
        description="People identities, membership, participation, facilities, and club operations masters (SCE-ICONS-06 Batch 3)."
        names={PEOPLE_OPERATIONS_MASTERS}
      />

      <MasterSection
        title="Section 6 — Finance & Commercial Operations"
        description="Facilities booking, finance, billing, commercial accounts, and commercial operations masters (SCE-ICONS-07 Batch 4)."
        names={FINANCE_COMMERCIAL_MASTERS}
      />

      <MasterSection
        title="Section 7 — Analytics, Reporting & Workflow"
        description="Analytics, reporting, workflow, automation, integration, and data lifecycle masters (SCE-ICONS-08 Batch 5)."
        names={ANALYTICS_WORKFLOW_MASTERS}
      />

      <MasterSection
        title="Section 8 — Final semantic masters"
        description="SCE-ICONS-12 / SCE-ICONS-13 — last approved domain semantics (competition, CMS surfaces, club development, governance)."
        names={FINAL_SEMANTIC_MASTERS}
      />

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
