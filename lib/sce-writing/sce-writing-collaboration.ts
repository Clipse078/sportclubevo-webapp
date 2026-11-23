import Collaboration from "@tiptap/extension-collaboration";
import type { Extensions } from "@tiptap/react";

import type { YDoc } from "@/lib/tenant-documentation/tenant-doc-yjs-client";

export type SceWritingCollaborationBinding = {
  document: YDoc;
  field: string;
};

export function buildSceWritingCollaborationExtensions(
  binding: SceWritingCollaborationBinding,
): Extensions {
  return [
    Collaboration.configure({
      document: binding.document,
      field: binding.field,
    }),
  ];
}