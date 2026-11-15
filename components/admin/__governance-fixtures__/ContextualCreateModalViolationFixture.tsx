"use client";

import CreateInitiativeComposerDialog from "@/components/admin/initiatives/CreateInitiativeComposerDialog";

/** DS-11 governance fixture — contextual create must not use composer dialog shells. */
export default function ContextualCreateModalViolationFixture() {
  return (
    <CreateInitiativeComposerDialog
      open
      onClose={() => undefined}
      preselectedTarget={{ id: "target-fixture", title: "Fixture Ziel" }}
      contextualLink={{
        targetId: "target-fixture",
        onFinished: () => undefined,
      }}
    />
  );
}