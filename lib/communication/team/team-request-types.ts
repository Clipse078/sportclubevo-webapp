import type { PlatformCommunicationKind } from "@prisma/client";

export type RequestSlotInput = {
  label: string;
  description?: string | null;
  requiredCapacity?: number;
  startAt?: string | null;
  endAt?: string | null;
};

export type TeamRequestSlotCapacityDto = {
  id: string;
  sortOrder: number;
  label: string;
  description: string | null;
  requiredCapacity: number;
  claimedCapacity: number;
  remainingCapacity: number;
  isFull: boolean;
  startAt: string | null;
  endAt: string | null;
  viewerHasClaim: boolean;
};

export type TeamRequestAggregateDto = {
  totalRequired: number;
  totalClaimed: number;
  totalRemaining: number;
  fullSlotCount: number;
  openSlotCount: number;
  isFull: boolean;
};

export type TeamRequestTimelineDto = {
  requestId: string;
  kind: Extract<PlatformCommunicationKind, "REQUEST">;
  lifecycle: string;
  deadlineAt: string | null;
  closedAt: string | null;
  eventId: string | null;
  isExpired: boolean;
  isOpen: boolean;
  canClaim: boolean;
  canManage: boolean;
  canViewClaimantDetail: boolean;
  slots: TeamRequestSlotCapacityDto[];
  aggregate: TeamRequestAggregateDto;
  viewerClaimedSlotIds: string[];
};

export type RequestClaimantRow = {
  claimId: string;
  slotId: string;
  recipientSnapshotId: string;
  subjectPersonId: string;
  subjectName: string;
  deliveryUserId: string;
  viaGuardianSubstitution: boolean;
  claimedAt: string;
};
