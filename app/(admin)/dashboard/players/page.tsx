import PlayersList from "@/components/admin/players/PlayersList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function PlayersPage() {
  await requirePermission(PERMISSIONS.PEOPLE_VIEW);

  const players: {
    id: string;
    name: string;
    teamLabel?: string | null;
    positionLabel?: string | null;
    birthYear?: string | null;
    imageSrc?: string | null;
    isActive?: boolean;
  }[] = [];

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Spieler"
        title="Spieler"
        description="Foto-first Spielerübersicht im FCA Premium UX Stil – vorbereitet für spätere Kader-, Team- und Website-Publikationslogik."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Spieler" },
        ]}
      >
        <PlayersList players={players} />
      </ListPagePattern>
    </PageShell>
  );
}
