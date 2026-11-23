import type { Editor } from "@tiptap/react";

import type { SceWritingProfileId } from "./sce-writing-extensions";

export type SceWritingInsertMenuItem = {
  id: string;
  title: string;
  hint?: string;
  keywords: string[];
  profiles: SceWritingProfileId[];
  run: (editor: Editor) => void;
};

const SCE_WRITING_INSERT_MENU_ITEMS: SceWritingInsertMenuItem[] = [
  {
    id: "paragraph",
    title: "Absatz",
    keywords: ["text", "p", "absatz"],
    profiles: ["task", "documentation"],
    run: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: "heading-2",
    title: "Überschrift 2",
    keywords: ["h2", "überschrift", "heading"],
    profiles: ["documentation"],
    run: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading-3",
    title: "Überschrift 3",
    keywords: ["h3", "überschrift", "heading"],
    profiles: ["documentation"],
    run: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: "bullet-list",
    title: "Aufzählung",
    keywords: ["liste", "bullet", "ul"],
    profiles: ["task", "documentation"],
    run: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: "ordered-list",
    title: "Nummerierte Liste",
    keywords: ["liste", "nummer", "ol"],
    profiles: ["task", "documentation"],
    run: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: "task-list",
    title: "Checkliste",
    keywords: ["todo", "check", "aufgabe"],
    profiles: ["task"],
    run: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
];

export function listSceWritingInsertMenuItems(
  profile: SceWritingProfileId,
  query = "",
): SceWritingInsertMenuItem[] {
  const normalized = query.trim().toLowerCase();
  return SCE_WRITING_INSERT_MENU_ITEMS.filter((item) => {
    if (!item.profiles.includes(profile)) return false;
    if (!normalized) return true;
    if (item.title.toLowerCase().includes(normalized)) return true;
    return item.keywords.some((keyword) => keyword.includes(normalized));
  });
}