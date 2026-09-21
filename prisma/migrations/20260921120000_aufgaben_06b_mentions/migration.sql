-- AUFGABEN-06B — Task comment @mentions + TASK_MENTION notifications (additive).

ALTER TYPE "NotificationType" ADD VALUE 'TASK_MENTION';

CREATE TABLE "TaskCommentMention" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCommentMention_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskCommentMention_tenantId_idx" ON "TaskCommentMention"("tenantId");

CREATE INDEX "TaskCommentMention_tenantId_commentId_idx" ON "TaskCommentMention"("tenantId", "commentId");

CREATE INDEX "TaskCommentMention_tenantId_userId_idx" ON "TaskCommentMention"("tenantId", "userId");

CREATE UNIQUE INDEX "TaskCommentMention_commentId_userId_key" ON "TaskCommentMention"("commentId", "userId");

ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
