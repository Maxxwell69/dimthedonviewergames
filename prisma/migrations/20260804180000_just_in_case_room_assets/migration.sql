-- AlterTable
ALTER TABLE "JustInCaseRoom" ADD COLUMN "assetsJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JustInCaseRoom" ADD COLUMN "assetsUpdatedAt" TIMESTAMP(3);
