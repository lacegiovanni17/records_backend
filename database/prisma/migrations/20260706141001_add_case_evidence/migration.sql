-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('DOCUMENT', 'LINK');

-- CreateEnum
CREATE TYPE "EvidenceConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "CaseEvidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "sourceClassification" TEXT,
    "confidence" "EvidenceConfidence" NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT,
    "url" TEXT,
    "addedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseEvidence_caseId_idx" ON "CaseEvidence"("caseId");

-- AddForeignKey
ALTER TABLE "CaseEvidence" ADD CONSTRAINT "CaseEvidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RedlistCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
