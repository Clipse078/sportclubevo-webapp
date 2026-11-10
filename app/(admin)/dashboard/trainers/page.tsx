import TrainersList from "@/components/admin/trainers/TrainersList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function TrainersPage() {
  await requirePermission(PERMISSIONS.PEOPLE_VIEW);

  const trainers: {
    id: string;
    name: string;
    teamLabel?: string | null;
    functionLabel?: string | null;
    imageSrc?: string | null;
    isActive?: boolean;
  }[] = [];

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Trainer"
        title="Trainer"
        description="Premium Trainerübersicht mit persönlicher Bildsprache, Rollenhinweisen und sauberer FCA Kartenlogik."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trainer" },
        ]}
      >
        <TrainersList trainers={trainers} />
      </ListPagePattern>
    </PageShell>
  );
}
