/*
  Warnings:

  - The `sourceClassification` column on the `CaseEvidence` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('GOVERNMENT', 'NEWS', 'COURT', 'REGULATORY', 'INTERNAL', 'OTHER');

-- AlterTable
ALTER TABLE "CaseEvidence" DROP COLUMN "sourceClassification",
ADD COLUMN     "sourceClassification" "EvidenceSourceType";
