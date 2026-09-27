import type { ReactNode } from "react";
import type { TeamChatMentionDto } from "@/lib/communication/team/team-chat-service";

type Props = {
  bodyText: string;
  mentions: TeamChatMentionDto[];
};

function mentionLabel(person: TeamChatMentionDto): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function TeamChatMessageBody({ bodyText, mentions }: Props) {
  if (mentions.length === 0) {
    return <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{bodyText}</p>;
  }

  const byName = new Map<string, TeamChatMentionDto>();
  for (const m of mentions) {
    byName.set(mentionLabel(m), m);
  }

  const parts: ReactNode[] = [];
  const tokens = bodyText.split(/(@[^\s@]+(?:\s+[^\s@]+)?)/g);
  for (const token of tokens) {
    if (token.startsWith("@")) {
      const name = token.slice(1).trim();
      const mention = byName.get(name);
      if (mention) {
        parts.push(
          <span
            key={`${mention.personId}-${parts.length}`}
            className="font-medium text-[var(--accent)]"
            data-mention-person-id={mention.personId}
          >
            @{name}
          </span>,
        );
        continue;
      }
    }
    parts.push(<span key={`t-${parts.length}`}>{token}</span>);
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{parts}</p>
  );
}
