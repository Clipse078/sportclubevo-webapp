import type { EventType } from "@prisma/client";

const EDIT_TITLE_BY_TYPE: Record<EventType, string> = {
  TRAINING: "Training bearbeiten",
  MATCH: "Spiel bearbeiten",
  TOURNAMENT: "Turnier bearbeiten",
  OTHER: "Veranstaltung bearbeiten",
  VACATION_PERIOD: "Ferienperiode bearbeiten",
};

const TYPE_CONTEXT_LABEL: Record<EventType, string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  OTHER: "Veranstaltung",
  VACATION_PERIOD: "Ferienperiode",
};

export function plannerEditPageTitle(type: EventType): string {
  return EDIT_TITLE_BY_TYPE[type] ?? "Eintrag bearbeiten";
}

export function plannerEditTypeContextLabel(type: EventType): string {
  return TYPE_CONTEXT_LABEL[type] ?? type;
}

export function formatPlannerEditScheduleLine(
  startAtIso: string,
  endAtIso: string | null,
  locale = "de-CH",
): string {
  if (!startAtIso) {
    return "";
  }

  const start = new Date(startAtIso);
  if (Number.isNaN(start.getTime())) {
    return "";
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const datePart = dateFmt.format(start);
  const startTime = timeFmt.format(start);

  if (!endAtIso) {
    return `${datePart} · ${startTime}`;
  }

  const end = new Date(endAtIso);
  if (Number.isNaN(end.getTime())) {
    return `${datePart} · ${startTime}`;
  }

  const endTime = timeFmt.format(end);
  return `${datePart} · ${startTime}–${endTime}`;
}

export function buildMatchEditSubtitle(args: {
  teamName: string | null;
  opponentName: string | null;
  title: string;
}): string {
  const team = args.teamName?.trim();
  const opponent = args.opponentName?.trim();

  if (team && opponent) {
    return `${team} — vs ${opponent}`;
  }

  if (team) {
    return team;
  }

  if (opponent) {
    return `vs ${opponent}`;
  }

  return args.title.trim();
}
