export const TEAM_CHAT_REACTION_KEYS = ["THUMBS_UP", "HEART", "JOY"] as const;

export type TeamChatReactionKey = (typeof TEAM_CHAT_REACTION_KEYS)[number];

export const TEAM_CHAT_REACTION_EMOJI: Record<TeamChatReactionKey, string> = {
  THUMBS_UP: "👍",
  HEART: "❤️",
  JOY: "😂",
};

export function isTeamChatReactionKey(value: string): value is TeamChatReactionKey {
  return (TEAM_CHAT_REACTION_KEYS as readonly string[]).includes(value);
}
