/**
 * Shared personal programme presentation boundary for Dashboard + Mein Programm (01J).
 *
 * Data path: Programme Engine PERSON scope → programme-item-personal-adapter → PersonalProgrammeItem.
 * UI: canonical Sce* cards via PersonalProgrammeCanonicalAgendaRow / ProgrammeSceActivityCard patterns.
 */
export type { PersonalProgrammeItem as PersonalProgrammeViewModel } from "./personal-programme-types";
export type {
  PersonalProgrammeSourceType,
  PersonalProgrammePresentationStatus,
} from "./personal-programme-types";
