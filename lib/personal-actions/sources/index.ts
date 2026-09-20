import { attendancePersonalActionSource } from "./attendance-source";
import { taskPersonalActionSource } from "./task-source";
import type { PersonalActionSourceAdapter } from "./types";

export const personalActionSources: PersonalActionSourceAdapter[] = [
  taskPersonalActionSource,
  attendancePersonalActionSource,
];

export { taskPersonalActionSource, attendancePersonalActionSource };
export type { PersonalActionSourceAdapter, PersonalActionSourceContext } from "./types";
