-- SCE-COMM-INBOX-01: Shared mailbox organization + per-user star state.

CREATE TYPE "CommunicationCenterMailboxOrganization" AS ENUM ('INBOX', 'ARCHIVED', 'TRASHED');

ALTER TABLE "CommunicationCenterConversation"
  ADD COLUMN "mailboxOrganization" "CommunicationCenterMailboxOrganization" NOT NULL DEFAULT 'INBOX',
  ADD COLUMN "mailboxOrganizationBeforeTrash" "CommunicationCenterMailboxOrganization";

ALTER TABLE "CommunicationCenterConversationReadState"
  ADD COLUMN "starredAt" TIMESTAMP(3);

CREATE INDEX "cc_conv_tenant_mbox_org_last_idx"
  ON "CommunicationCenterConversation"("tenantId", "mailboxOrganization", "lastMessageAt");

CREATE INDEX "cc_conv_read_user_star_idx"
  ON "CommunicationCenterConversationReadState"("tenantId", "userId", "starredAt");
