-- CreateEnum
CREATE TYPE "CaseSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('UNDER_INVESTIGATION', 'ALLEGED', 'CHARGED', 'CONVICTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CaseRole" AS ENUM ('PRIMARY_SUBJECT', 'LINKED_COMPANY', 'LINKED_INDIVIDUAL');

-- CreateEnum
CREATE TYPE "CaseCategory" AS ENUM ('LEGAL_CRIMINAL', 'REGULATORY_COMPLIANCE', 'FINANCIAL_RISK', 'AML_FINANCIAL_CRIME', 'CORPORATE_GOVERNANCE', 'SANCTIONS_WATCHLISTS', 'DATA_PRIVACY_CYBERSECURITY', 'LABOR_HUMAN_RIGHTS', 'RELATIONSHIP_RISK', 'ENVIRONMENTAL', 'DOCUMENTATION_VERIFICATION', 'LITIGATION_DISPUTES', 'REPUTATION_RISK', 'OPERATIONAL_RISK', 'POLITICAL_EXPOSURE');

-- CreateTable
CREATE TABLE "RedlistCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseReference" TEXT,
    "category" "CaseCategory" NOT NULL,
    "severity" "CaseSeverity" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'UNDER_INVESTIGATION',
    "summary" TEXT,
    "jurisdiction" TEXT,
    "legalBasis" TEXT,
    "authority" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "incidentDate" DATE,
    "filedDate" DATE,
    "resolutionDate" DATE,
    "assignedToAdminId" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "RedlistCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEntity" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "companyId" TEXT,
    "individualId" TEXT,
    "roleInCase" "CaseRole" NOT NULL,
    "addedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "changedByAdminId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RedlistCase_category_idx" ON "RedlistCase"("category");

-- CreateIndex
CREATE INDEX "RedlistCase_severity_idx" ON "RedlistCase"("severity");

-- CreateIndex
CREATE INDEX "RedlistCase_status_idx" ON "RedlistCase"("status");

-- CreateIndex
CREATE INDEX "CaseEntity_caseId_idx" ON "CaseEntity"("caseId");

-- CreateIndex
CREATE INDEX "CaseEntity_companyId_idx" ON "CaseEntity"("companyId");

-- CreateIndex
CREATE INDEX "CaseEntity_individualId_idx" ON "CaseEntity"("individualId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_idx" ON "CaseStatusHistory"("caseId");

-- AddForeignKey
ALTER TABLE "CaseEntity" ADD CONSTRAINT "CaseEntity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RedlistCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEntity" ADD CONSTRAINT "CaseEntity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEntity" ADD CONSTRAINT "CaseEntity_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RedlistCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
