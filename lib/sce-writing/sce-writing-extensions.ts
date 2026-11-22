import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";

import { SceInlineMentionMark } from "@/lib/collaboration/mentions/inline-mention-mark";

export type SceWritingProfileId = "task" | "documentation";

export type BuildSceWritingExtensionsOptions = {
  profile: SceWritingProfileId;
  placeholder: string;
  enableMentions?: boolean;
};

export function buildSceWritingExtensions(options: BuildSceWritingExtensionsOptions): Extensions {
  const extensions: Extensions = [];

  if (options.profile === "task") {
    extensions.push(
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      TaskList.configure({
        HTMLAttributes: { class: "task-description-checklist" },
      }),
      TaskItem.configure({
        nested: false,
        HTMLAttributes: { class: "task-description-task-item" },
      }),
    );
  } else {
    extensions.push(
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        codeBlock: false,
        link: false,
        underline: false,
      }),
    );
  }

  extensions.push(
    Link.configure({
      openOnClick: false,
      ...(options.profile === "task"
        ? {
            HTMLAttributes: {
              rel: "noopener noreferrer",
              target: "_blank",
            },
          }
        : {}),
    }),
    Placeholder.configure({ placeholder: options.placeholder }),
  );

  if (options.enableMentions) {
    extensions.push(SceInlineMentionMark);
  }

  return extensions;
}