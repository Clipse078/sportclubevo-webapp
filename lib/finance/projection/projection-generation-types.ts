import type {
  ProjectionConfidenceLevel,
  ProjectionDataSufficiencyLevel,
  ProjectionDataSufficiencyReason,
  ProjectionEvidenceKind,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";

export type ProjectionGenerationEvidenceInput = {
  kind: ProjectionEvidenceKind;
  financeYearId?: string | null;
  financialAccountId?: string | null;
  observationsCount?: number | null;
  fromDate?: string | null;
  throughDate?: string | null;
  sourceReference?: string | null;
  fingerprint?: string | null;
};

export type ProjectionGenerationReasonCodeInput = {
  dimension: "DATA_SUFFICIENCY" | "CONFIDENCE" | "GENERATION";
  code: string;
};

export type ProjectionGenerationLineInput = {
  financialAccountId: string;
  projectedAmountMinor: number | null;
  lowerBoundMinor?: number | null;
  upperBoundMinor?: number | null;
};

export type GenerateProjectionSnapshotInput = {
  financeYearId: string;
  currency: string;
  actualsThroughDate: string;
  methodologyFamily: ProjectionMethodologyFamily;
  engineVersion: string;
  dataSufficiency: ProjectionDataSufficiencyLevel;
  confidence: ProjectionConfidenceLevel;
  generationActorType?: "USER" | "SYSTEM";
  evidenceFingerprint?: string | null;
  sufficiencyReasons?: readonly ProjectionDataSufficiencyReason[];
  confidenceRationaleCodes?: readonly string[];
  evidence?: readonly ProjectionGenerationEvidenceInput[];
  lines?: readonly ProjectionGenerationLineInput[];
};

export type GenerateProjectionSnapshotResult = {
  financeProjectionId: string;
  projectionVersionId: string;
  versionNumber: number;
  supersededVersionId: string | null;
  lineCount: number;
};
