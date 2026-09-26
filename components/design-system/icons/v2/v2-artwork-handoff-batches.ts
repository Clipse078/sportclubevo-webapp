/**
 * Product-owner artwork handoff batches (12–18 icons), prioritized by visibility.
 */

import type { SceApprovedMasterIconName } from "../masters/approved-hero-meta";
import { buildV1MasterOpticalAudit } from "./v1-master-optical-audit";

export type V2ArtworkHandoffBatch = {
  batchName: string;
  iconNames: SceApprovedMasterIconName[];
  keepGeometryMonochrome: number;
  simplify: number;
  redraw: number;
  priority: "P0" | "P1" | "P2";
  reason: string;
};

const BATCH_1: SceApprovedMasterIconName[] = [
  "dashboard",
  "week-planner",
  "training",
  "match",
  "tournament",
  "planning",
  "team",
  "season",
  "standings",
  "results",
  "attendance",
  "organisation",
  "org-unit",
  "people",
  "settings",
  "notifications",
  "tasks",
  "communication",
];

const BATCH_2: SceApprovedMasterIconName[] = [
  "website",
  "page",
  "homepage-builder",
  "block-library",
  "media-library",
  "website-navigation",
  "news",
  "publish",
  "infoboard",
  "events",
  "competition",
  "club",
  "documents",
  "requirements",
  "roles-access",
  "attention",
  "audit",
  "conflict",
];

const BATCH_3: SceApprovedMasterIconName[] = [
  "player",
  "coach",
  "member",
  "contact",
  "invitation",
  "guardian-parent",
  "team-management",
  "committee-board",
  "volunteer",
  "sponsor",
  "partner",
  "assignment",
  "availability",
  "absence",
  "check-in",
  "facility",
  "pitch",
  "dressing-room",
];

const BATCH_4: SceApprovedMasterIconName[] = [
  "finance",
  "payment",
  "transaction",
  "budget",
  "expense",
  "revenue",
  "subscription",
  "contract",
  "booking",
  "facility-booking",
  "billing-invoice",
  "receipt",
  "qr-invoice",
  "commercial-account",
  "cost-centre",
  "business-club",
  "sponsorship-management",
  "resource-allocation",
];

const BATCH_5: SceApprovedMasterIconName[] = [
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
  "goal",
  "initiative",
  "material-inventory",
  "discipline-incident",
  "target-group",
  "waiting-list",
];

function summarizeBatch(
  batchName: string,
  iconNames: SceApprovedMasterIconName[],
  priority: V2ArtworkHandoffBatch["priority"],
  reason: string,
): V2ArtworkHandoffBatch {
  const auditByName = new Map(buildV1MasterOpticalAudit().map((r) => [r.name, r]));
  let keepGeometryMonochrome = 0;
  let simplify = 0;
  let redraw = 0;
  for (const name of iconNames) {
    const rec = auditByName.get(name);
    if (!rec) continue;
    if (rec.recommendation === "KEEP_GEOMETRY_MONOCHROME") keepGeometryMonochrome += 1;
    if (rec.recommendation === "SIMPLIFY") simplify += 1;
    if (rec.recommendation === "REDRAW") redraw += 1;
  }
  return {
    batchName,
    iconNames,
    keepGeometryMonochrome,
    simplify,
    redraw,
    priority,
    reason,
  };
}

export const SCE_V2_ARTWORK_HANDOFF_BATCHES: V2ArtworkHandoffBatch[] = [
  summarizeBatch(
    "Batch 1 — Core shell, planning & dashboard",
    BATCH_1,
    "P0",
    "Highest-frequency navigation, dashboard, and planning surfaces (includes PO-flagged training simplification).",
  ),
  summarizeBatch(
    "Batch 2 — Website / CMS & publishing",
    BATCH_2,
    "P0",
    "Website module and CMS semantics with known 20–24px legibility debt (page, libraries, navigation, homepage builder).",
  ),
  summarizeBatch(
    "Batch 3 — People, membership & club operations",
    BATCH_3,
    "P1",
    "Org-unit rows, people identities, facilities, and club operations list/navigation surfaces.",
  ),
  summarizeBatch(
    "Batch 4 — Finance & commercial",
    BATCH_4,
    "P1",
    "Finance module KPI/cards and commercial operations — moderate visibility, similar stroke vocabulary.",
  ),
  summarizeBatch(
    "Batch 5 — Analytics, workflow & final semantics",
    BATCH_5,
    "P2",
    "Workflow/analytics masters and remaining final semantic concepts.",
  ),
];
