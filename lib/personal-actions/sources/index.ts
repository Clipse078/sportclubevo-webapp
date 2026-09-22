import { attendancePersonalActionSource } from "./attendance-source";
import { requirementPersonalActionSource } from "./requirement-source";
import { taskPersonalActionSource } from "./task-source";
import type { PersonalActionSourceAdapter } from "./types";

export const personalActionSources: PersonalActionSourceAdapter[] = [
  taskPersonalActionSource,
  attendancePersonalActionSource,
  requirementPersonalActionSource,
];

export { taskPersonalActionSource, attendancePersonalActionSource, requirementPersonalActionSource };
export type { PersonalActionSourceAdapter, PersonalActionSourceContext } from "./types";
