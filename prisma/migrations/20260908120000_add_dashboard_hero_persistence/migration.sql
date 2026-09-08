-- SCE-DASHBOARD-V3-03: personal dashboard hero image + transform persistence (per User).

ALTER TABLE "User"
ADD COLUMN "dashboardHeroImageUrl" TEXT,
ADD COLUMN "dashboardHeroImageZoom" DOUBLE PRECISION,
ADD COLUMN "dashboardHeroImagePositionX" DOUBLE PRECISION,
ADD COLUMN "dashboardHeroImagePositionY" DOUBLE PRECISION;
