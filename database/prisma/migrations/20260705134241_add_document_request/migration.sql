-- CreateEnum
CREATE TYPE "RejectionReasonCode" AS ENUM ('ILLEGIBLE', 'EXPIRED', 'MISMATCH', 'INCOMPLETE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "rejectionReasonCode" "RejectionReasonCode";

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentName" "DocumentName" NOT NULL,
    "assignedToAdminId" TEXT NOT NULL,
    "requestedByAdminId" TEXT NOT NULL,
    "message" TEXT,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentRequest_companyId_idx" ON "DocumentRequest"("companyId");

-- CreateIndex
CREATE INDEX "DocumentRequest_assignedToAdminId_idx" ON "DocumentRequest"("assignedToAdminId");

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
