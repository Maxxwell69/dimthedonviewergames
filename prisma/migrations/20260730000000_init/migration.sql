-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wheel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Viewer Games',
    "displayToken" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "removeOnWin" BOOLEAN NOT NULL DEFAULT true,
    "spinDurationMs" INTEGER NOT NULL DEFAULT 8000,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowDuplicates" BOOLEAN NOT NULL DEFAULT false,
    "isSpinning" BOOLEAN NOT NULL DEFAULT false,
    "spinStartedAt" TIMESTAMP(3),
    "spinEndsAt" TIMESTAMP(3),
    "spinTargetAngle" DOUBLE PRECISION,
    "currentWinner" TEXT,
    "lastWinnerAt" TIMESTAMP(3),
    "entriesText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wheel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "tiktokUsername" TEXT,
    "tiktokUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Winner" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wheel_displayToken_key" ON "Wheel"("displayToken");

-- CreateIndex
CREATE UNIQUE INDEX "Wheel_webhookSecret_key" ON "Wheel"("webhookSecret");

-- CreateIndex
CREATE INDEX "Wheel_userId_idx" ON "Wheel"("userId");

-- CreateIndex
CREATE INDEX "Entry_wheelId_idx" ON "Entry"("wheelId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_wheelId_label_key" ON "Entry"("wheelId", "label");

-- CreateIndex
CREATE INDEX "Winner_wheelId_idx" ON "Winner"("wheelId");

-- AddForeignKey
ALTER TABLE "Wheel" ADD CONSTRAINT "Wheel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
