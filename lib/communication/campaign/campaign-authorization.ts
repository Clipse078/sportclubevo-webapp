/**
 * SCE-COMM-12 — Campaign authorization (reuses COMM-11 club send scope).
 */

export {
  resolveClubCommunicationAuthorization as resolveCampaignAuthorization,
  requireClubCommunicationSend as requireCampaignSend,
  requireClubCommunicationView as requireCampaignView,
  requireClubCommunicationEngagementDetail as requireCampaignEngagementDetail,
  type ClubCommunicationAuthorization as CampaignAuthorization,
} from "@/lib/communication/club/club-communication-authorization";
