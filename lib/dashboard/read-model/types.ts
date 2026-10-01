import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type {
  DashboardPersonalTaskPreviewItem,
  PersonalAttentionItem,
} from "@/lib/dashboard/personal-attention/types";

export type PersonalDashboardReadModelScopeHints = {
  participationNavCapable: boolean;
  requirementRecipientCapable: boolean;
  hasLinkedPerson: boolean;
  hasActiveTenantMembership: boolean;
};

export type PersonalDashboardReadModelPayloadV1 = {
  v: typeof import("./constants").PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION;
  scopeHints: PersonalDashboardReadModelScopeHints;
  programme: {
    supported: boolean;
    items: PersonalProgrammeItem[];
  };
  personalWork: {
    attentionItems: PersonalAttentionItem[];
    attentionTotalCount: number;
    viewAllHref: string | null;
    operationalSourcesDegraded: boolean;
    taskCount: number | null;
    taskPreview: DashboardPersonalTaskPreviewItem[];
  };
};

export type PersonalDashboardReadModelRecord = {
  id: string;
  tenantId: string;
  userId: string;
  personId: string | null;
  projectionVersion: number;
  payloadJson: unknown;
  horizonStart: Date;
  horizonEnd: Date;
  builtAt: Date;
  updatedAt: Date;
};
