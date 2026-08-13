-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastTimesheetReminderAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/London';
