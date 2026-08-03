-- CreateTable
CREATE TABLE "JustInCaseRoom" (
    "token" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustInCaseRoom_pkey" PRIMARY KEY ("token")
);
