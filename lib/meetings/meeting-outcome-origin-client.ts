import { buildCanonicalAgendaDisplayOrderMap } from "@/lib/meetings/agenda-display-order";
import { buildMeetingTraktandumDeepLink } from "@/lib/meetings/meeting-traktandum-navigation";
import type { MeetingOutcomeOrigin } from "@/lib/meetings/meeting-outcome-origin-types";

export function buildDecisionOutcomeOrigin(input: {
  meetingSlug: string;
  meetingTitle: string;
  agendaItems: Array<{ id: string; orderIndex: number; title: string }>;
  sourceAgendaItemId: string | null;
  decisionTitle?: string;
}): MeetingOutcomeOrigin | null {
  if (!input.sourceAgendaItemId) return null;
  const agenda = input.agendaItems.find((a) => a.id === input.sourceAgendaItemId);
  if (!agenda) return null;

  const displayOrder = buildCanonicalAgendaDisplayOrderMap(input.agendaItems);
  const position = displayOrder.get(agenda.id) ?? 0;

  const links: MeetingOutcomeOrigin["links"] = [
    {
      label: input.meetingTitle,
      href: `/vereinsleitung/meetings/${encodeURIComponent(input.meetingSlug)}`,
      restricted: false,
    },
    {
      label: position > 0 ? `Traktandum ${position}: ${agenda.title}` : agenda.title,
      href: buildMeetingTraktandumDeepLink(input.meetingSlug, agenda.id),
      restricted: false,
    },
  ];

  if (input.decisionTitle?.trim()) {
    links.push({
      label: input.decisionTitle.trim(),
      href: null,
      restricted: false,
    });
  }

  return { links };
}