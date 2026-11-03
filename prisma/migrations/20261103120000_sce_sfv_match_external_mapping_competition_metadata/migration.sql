-- AlterTable
ALTER TABLE "MatchExternalMapping" ADD COLUMN     "providerGroupId" INTEGER,
ADD COLUMN     "providerGroupName" TEXT,
ADD COLUMN     "providerMatchType" INTEGER,
ADD COLUMN     "providerMatchTypeName" TEXT,
ADD COLUMN     "providerCupId" INTEGER,
ADD COLUMN     "providerPlayDay" INTEGER,
ADD COLUMN     "providerPlayDayName" TEXT;
