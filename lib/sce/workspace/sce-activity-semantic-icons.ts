/**
 * SCE-UI-STANDARD-01 — semantic icons for activity workspaces (NAV-01 first adoption).
 * Stable meaning across Training, Match, Tournament, Veranstaltung.
 * @see docs/design/SCE-WORKSPACE-SURFACE-STANDARD.md
 */
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Ellipsis,
  Globe,
  Info,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Settings,
  Trophy,
  UserCheck,
  Users,
  FileText,
} from "lucide-react";

export const SCE_ACTIVITY_SEMANTIC_ICONS = {
  overview: Info,
  squad: Users,
  participation: UserCheck,
  planning: CalendarRange,
  operations: Trophy,
  communication: MessageSquare,
  publication: Globe,
  tasks: ClipboardList,
  matchInfo: Info,
  schedule: CalendarClock,
  location: MapPin,
  resources: LayoutGrid,
  documents: FileText,
  settings: Settings,
  mehr: Ellipsis,
} as const satisfies Record<string, LucideIcon>;

export type SceActivitySemanticIconKey = keyof typeof SCE_ACTIVITY_SEMANTIC_ICONS;

export function getSceActivitySemanticIcon(key: SceActivitySemanticIconKey): LucideIcon {
  return SCE_ACTIVITY_SEMANTIC_ICONS[key];
}
