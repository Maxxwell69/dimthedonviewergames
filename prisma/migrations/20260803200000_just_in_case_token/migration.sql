-- AlterTable
ALTER TABLE "User" ADD COLUMN "justInCaseToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_justInCaseToken_key" ON "User"("justInCaseToken");
