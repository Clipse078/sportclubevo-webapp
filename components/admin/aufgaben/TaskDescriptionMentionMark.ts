import { Mark, mergeAttributes } from "@tiptap/core";

/** Inline @mention mark stored in Task / Strategie / Ziel Beschreibung JSON. */
export const TaskDescriptionMentionMark = Mark.create({
  name: "taskDescriptionMention",
  inclusive: false,
  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mention-user-id"),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mention-label"),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-mention-user-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = String(HTMLAttributes.label ?? "");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention-user-id": HTMLAttributes.userId,
        "data-mention-label": label,
        class: "rounded bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] px-0.5 font-medium text-[var(--sce-primary)]",
      }),
      `@${label}`,
    ];
  },
});