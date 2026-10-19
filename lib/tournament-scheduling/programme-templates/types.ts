/**
 * SCE Tournament Planner 02D — predefined programme template contracts (code-backed catalogue).
 */

export type ProgrammeTemplateFamily = "YOUTH_ROTATION_MULTI_PITCH";

/** Approved youth programme family for curated lookup — not shown in SCE UI. */
export type ProgrammeTemplateCategoryContext = "G" | "F" | "E_FF12";

export type ProgrammeTemplateLookupKey = {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  participantCount: number;
  programmeFamily?: ProgrammeTemplateFamily;
  version?: number;
};

export type TemplateParticipantSlotId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P";

/** Side reference within a template — full slot or tournament-local subunit (A1, A2, …). */
export type TemplateSideRef = {
  slot: TemplateParticipantSlotId;
  /** Omitted or 0 = full participant capacity; 1/2/… = subunit index within slot. */
  subunitIndex?: number;
};

export type TemplateFieldPlayingFormat = {
  playersPerSide: number;
};

export type TemplateFieldDefinition = {
  fieldKey: string;
  label: string;
  displayOrder: number;
  playingFormat: TemplateFieldPlayingFormat;
};

export type TemplateRoundAssignment = {
  fieldKey: string;
  home: TemplateSideRef;
  away: TemplateSideRef;
};

export type TemplateRoundDefinition = {
  /** 1-based round number (matches reference Spielpläne). */
  roundNumber: number;
  assignments: readonly TemplateRoundAssignment[];
};

export type TemplateBreakHint = {
  /** Insert tournament break after this 1-based round number completes. */
  afterRoundNumber: number;
  label?: string;
};

export type TemplateOperationalHint = {
  kind: "SMALL_FIELD_SUBTEAM_SWITCH";
  /** Reference programmes: switch Kleinteams after N minutes on small fields — metadata only in 02D. */
  switchAfterMinutes: number;
};

export type TournamentProgrammeTemplate = {
  id: string;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  displayName: string;
  programmeFamily: ProgrammeTemplateFamily;
  categoryContext: ProgrammeTemplateCategoryContext;
  participantCount: number;
  participantSlots: readonly TemplateParticipantSlotId[];
  fields: readonly TemplateFieldDefinition[];
  rounds: readonly TemplateRoundDefinition[];
  breakHints: readonly TemplateBreakHint[];
  operationalHints?: readonly TemplateOperationalHint[];
  /** Internal maintainability — not shown in SCE UI. */
  referenceDocumentId?: string;
};

export type ParticipantSlotMapping = Readonly<
  Record<TemplateParticipantSlotId, string>
>;

export type ResolvedTemplateSide = {
  participantId: string;
  participantUnitId: string;
  slot: TemplateParticipantSlotId;
  subunitIndex: number | null;
};

export type InstantiatedTemplateFixturePlan = {
  templateId: string;
  templateVersion: number;
  slotMapping: ParticipantSlotMapping;
  roundIndex: number;
  slotIndexInRound: number;
  fieldKey: string;
  fieldDisplayOrder: number;
  playersPerSide: number;
  home: ResolvedTemplateSide;
  away: ResolvedTemplateSide;
  generatorKey: string;
};

export type InstantiatedTemplateProgrammePlan = {
  template: TournamentProgrammeTemplate;
  slotMapping: ParticipantSlotMapping;
  fixtures: readonly InstantiatedTemplateFixturePlan[];
  fieldCount: number;
  roundCount: number;
};
