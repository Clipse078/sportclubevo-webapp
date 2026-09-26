"use client";

import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";

function sceIconComponent(name: SceIconRegistryName, defaultSize = 16) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function DomainSceIconGlyph(
    { className, size, width, height, ...rest },
    _ref,
  ) {
    void rest;
    const w = typeof width === "number" ? width : typeof size === "number" ? size : typeof height === "number" ? height : defaultSize;
    const resolved =
      w <= 12 ? 12 : w <= 16 ? 16 : w <= 20 ? 20 : w <= 24 ? 24 : w <= 32 ? 32 : 48;
    return (
      <ProductDomainSceIcon
        name={name}
        size={resolved as 12 | 16 | 20 | 24 | 32 | 48}
        className={className}
      />
    );
  });
  Icon.displayName = `DomainSceIcon(${name})`;
  return Icon;
}

export const OrganisationSceIcon = sceIconComponent("organisation");
export const OrgUnitSceIcon = sceIconComponent("org-unit");
export const PeopleSceIcon = sceIconComponent("people");
export const MemberSceIcon = sceIconComponent("member");
export const TeamSceIcon = sceIconComponent("team");
export const RolesAccessSceIcon = sceIconComponent("roles-access");
export const ClubSceIcon = sceIconComponent("club");
export const SeasonSceIcon = sceIconComponent("season");
export const CommunicationSceIcon = sceIconComponent("communication");
export const WebsiteSceIcon = sceIconComponent("website");
export const TasksSceIcon = sceIconComponent("tasks");
export const DocumentsSceIcon = sceIconComponent("documents");
export const FinanceSceIcon = sceIconComponent("finance");
export const MatchSceIcon = sceIconComponent("match");
export const NewsSceIcon = sceIconComponent("news");
export const SettingsSceIcon = sceIconComponent("settings");
export const SponsorSceIcon = sceIconComponent("sponsor");
export const FacilitySceIcon = sceIconComponent("facility");
export const IntegrationSceIcon = sceIconComponent("integration");
export const NotificationsSceIcon = sceIconComponent("notifications");
export const PublishSceIcon = sceIconComponent("publish");
export const RequirementsSceIcon = sceIconComponent("requirements");
export const InfoboardSceIcon = sceIconComponent("infoboard");
