import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewTargetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Ziele"
        title="Neues Ziel erstellen"
        description="Strategisches Ziel mit messbaren Kennzahlen erfassen. Optional eine Vorlage als Ausgangspunkt verwenden."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Strategie & Ziele", href: "/vereinsleitung/strategie-und-ziele?ansicht=ziele" },
          { label: "Neues Ziel" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <TargetNewPageClient layout="composer" />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
