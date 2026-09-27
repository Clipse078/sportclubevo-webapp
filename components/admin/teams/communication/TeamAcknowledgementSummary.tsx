"use client";

import type { TeamCommunicationEngagementSummary } from "@/lib/communication/team/team-formal-communication-service";

type Props = {
  summary: TeamCommunicationEngagementSummary;
};

export function TeamAcknowledgementSummary({ summary }: Props) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
      data-testid="team-ack-summary"
    >
      <p className="font-medium text-[var(--foreground)]">Empfänger-Status</p>
      <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--text-2)] sm:grid-cols-4">
        <li data-testid="team-ack-recipient-count">{summary.recipientCount} Empfänger</li>
        <li data-testid="team-ack-read-count">{summary.readCount} gelesen</li>
        <li data-testid="team-ack-ack-count">{summary.acknowledgedCount} bestätigt</li>
        <li data-testid="team-ack-unread-count">{summary.unreadCount} ungelesen</li>
      </ul>
    </div>
  );
}
