-- CreateEnum
CREATE TYPE "RecurrencePeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecurrenceUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RECURRING_CASE_CREATED';

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceCustomUnit" "RecurrenceUnit",
ADD COLUMN     "recurrenceCustomValue" INTEGER,
ADD COLUMN     "recurrenceGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceParentId" TEXT,
ADD COLUMN     "recurrencePeriod" "RecurrencePeriod";

-- CreateIndex
CREATE INDEX "Case_isRecurring_recurrenceGeneratedAt_dueDate_idx" ON "Case"("isRecurring", "recurrenceGeneratedAt", "dueDate");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
