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
export const TournamentSceIcon = sceIconComponent("tournament");
export const EventsSceIcon = sceIconComponent("events");
export const NewsSceIcon = sceIconComponent("news");
export const SettingsSceIcon = sceIconComponent("settings");
export const SponsorSceIcon = sceIconComponent("sponsor");
export const FacilitySceIcon = sceIconComponent("facility");
export const IntegrationSceIcon = sceIconComponent("integration");
export const NotificationsSceIcon = sceIconComponent("notifications");
export const PublishSceIcon = sceIconComponent("publish");
export const RequirementsSceIcon = sceIconComponent("requirements");
export const InfoboardSceIcon = sceIconComponent("infoboard");
export const ArchiveSceIcon = sceIconComponent("archive");
export const TrainingSceIcon = sceIconComponent("training");
export const WorkflowSceIcon = sceIconComponent("workflow");
export const ReportSceIcon = sceIconComponent("report");
export const PaymentSceIcon = sceIconComponent("payment");
export const AnalyticsSceIcon = sceIconComponent("analytics");
export const ApprovalSceIcon = sceIconComponent("approval");
export const ExportSceIcon = sceIconComponent("export");
export const HistorySceIcon = sceIconComponent("history");
export const ResultsSceIcon = sceIconComponent("results");
export const ContactSceIcon = sceIconComponent("contact");
export const DashboardSceIcon = sceIconComponent("dashboard");
export const AttentionSceIcon = sceIconComponent("attention");
export const CompetitionSceIcon = sceIconComponent("competition");
export const PageSceIcon = sceIconComponent("page");
export const MediaLibrarySceIcon = sceIconComponent("media-library");
export const BlockLibrarySceIcon = sceIconComponent("block-library");
export const WebsiteNavigationSceIcon = sceIconComponent("website-navigation");
export const HomepageBuilderSceIcon = sceIconComponent("homepage-builder");
export const GoalSceIcon = sceIconComponent("goal");
export const InitiativeSceIcon = sceIconComponent("initiative");
export const MaterialInventorySceIcon = sceIconComponent("material-inventory");
export const DisciplineIncidentSceIcon = sceIconComponent("discipline-incident");
export const TargetGroupSceIcon = sceIconComponent("target-group");
export const WaitingListSceIcon = sceIconComponent("waiting-list");
