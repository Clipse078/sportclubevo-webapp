"use client";

import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import PeopleAccessWizard, {
  type PeopleAccessWizardProps,
} from "@/components/admin/users/people-access/PeopleAccessWizard";

type Props = Omit<PeopleAccessWizardProps, "onCancel"> & {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onComplete: (userId: string) => void;
};

export default function PeopleAccessInlineCreateCard({
  expanded,
  onExpandedChange,
  onComplete,
  ...wizardProps
}: Props) {
  const panelId = "people-access-inline-create-panel";

  return (
    <SceClubDevelopmentContextualCreateCollapsibleShell
      actionLabel="Person hinzufügen"
      contextLabel="Einladung und Zugriff inline — ohne Dialog"
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      panelDomId={panelId}
      cardTestId="people-access-inline-create"
      collapseToggleTestId="people-access-inline-create-toggle"
    >
      <PeopleAccessWizard
        {...wizardProps}
        onCancel={() => onExpandedChange(false)}
        onComplete={(userId) => {
          onComplete(userId);
          onExpandedChange(false);
        }}
      />
    </SceClubDevelopmentContextualCreateCollapsibleShell>
  );
}