-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CORPORATE', 'COMPLIANCE', 'FINANCIALS', 'LEGAL');

-- CreateEnum
CREATE TYPE "DocumentName" AS ENUM ('CERTIFICATE_OF_INCORPORATION', 'BUSINESS_REGISTRATION', 'TAX_CERTIFICATE', 'REGULATORY_FILINGS', 'FINANCIAL_STATEMENT', 'AUDIT_REPORTS', 'COURT_FILINGS', 'AGREEMENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentName" "DocumentName" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT,
    "source" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "verificationSource" "VerificationSource",
    "verifiedByAdminId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "uploadedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
