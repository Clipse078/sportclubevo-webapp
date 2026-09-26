import { Shield, UserCheck } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

type PersonRoleBadgeProps = {
  isPlayer?: boolean;
  isTrainer?: boolean;
};

export default function PersonRoleBadge({
  isPlayer,
  isTrainer,
}: PersonRoleBadgeProps) {
  if (!isPlayer && !isTrainer) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isPlayer ? (
        <span className="sce-role-badge sce-role-badge-player">
          <ProductDomainSceIcon name="roles-access" size={20} />
          Spieler
        </span>
      ) : null}
      {isTrainer ? (
        <span className="sce-role-badge sce-role-badge-trainer">
          <UserCheck className="h-2.5 w-2.5" />
          Trainer
        </span>
      ) : null}
    </div>
  );
}
