-- CreateTable
CREATE TABLE "DeveloperRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayRate" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeveloperRate_userId_idx" ON "DeveloperRate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperRate_userId_startDate_key" ON "DeveloperRate"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "DeveloperRate" ADD CONSTRAINT "DeveloperRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry each user's current dayRate into their rate history,
-- effective from when their account was created.
INSERT INTO "DeveloperRate" ("id", "userId", "dayRate", "startDate", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "dayRate", "createdAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dayRate";
