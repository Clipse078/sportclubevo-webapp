import type {
  RequirementResolutionStatus,
  RequirementResponseMode,
  RequirementResponseValue,
  RequirementStatus,
} from "@prisma/client";

export type RequirementServiceContext = {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
};

export type RequirementDto = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  responseMode: RequirementResponseMode;
  dueAt: string | null;
  reminder1At: string | null;
  reminder2At: string | null;
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  remindersConfigured: boolean;
  activatedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  draftAudiencePersonIds: string[];
  draftAudienceTeamIds: string[];
  draftAudienceOrgUnitIds: string[];
  draftAudienceRoleIds: string[];
  draftAudienceTargetGroupIds: string[];
};

export type RequirementDraftAudienceInput = {
  personIds?: readonly string[];
  teamIds?: readonly string[];
  orgUnitIds?: readonly string[];
  roleIds?: readonly string[];
  targetGroupIds?: readonly string[];
};

export type RequirementAudienceSelection = {
  personIds: string[];
  teamIds: string[];
  orgUnitIds: string[];
  roleIds: string[];
  targetGroupIds: string[];
};

export type RequirementRecipientDto = {
  id: string;
  tenantId: string;
  requirementId: string;
  subjectPersonId: string;
  resolutionStatus: RequirementResolutionStatus;
  responseValue: RequirementResponseValue | null;
  respondedAt: string | null;
  respondedByUserId: string | null;
  responseActorPersonId: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementAggregateDto = {
  totalRecipients: number;
  openCount: number;
  resolvedCount: number;
  acknowledgedCount: number;
  overdueCount: number;
  resolvedPercent: number;
};

export type CreateRequirementDraftInput = {
  title: string;
  description?: string | null;
  responseMode?: RequirementResponseMode;
  dueAt?: Date | null;
  reminder1At?: Date | null;
  reminder2At?: Date | null;
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
  remindersConfigured?: boolean;
};

export type UpdateRequirementDraftInput = {
  title?: string;
  description?: string | null;
  responseMode?: RequirementResponseMode;
  dueAt?: Date | null;
  reminder1At?: Date | null;
  reminder2At?: Date | null;
  reminder1PresetKey?: string | null;
  reminder2PresetKey?: string | null;
  remindersConfigured?: boolean;
};

export type ListRequirementsFilter = {
  status?: RequirementStatus | RequirementStatus[];
  limit?: number;
  cursor?: string;
};

export type ListRequirementRecipientsFilter = {
  requirementId: string;
  resolutionStatus?: RequirementResolutionStatus;
  limit?: number;
  cursor?: string;
};

export const DEFAULT_REQUIREMENT_LIST_LIMIT = 50;
export const MAX_REQUIREMENT_LIST_LIMIT = 100;
