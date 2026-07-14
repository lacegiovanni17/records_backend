-- CreateTable
CREATE TABLE "Individual" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "middleName" TEXT,
    "photoUrl" TEXT,
    "about" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "redlistStatus" "RedlistStatus" NOT NULL DEFAULT 'CLEAN',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationSource" "VerificationSource",
    "verifiedByAdminId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "premblyReference" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Individual_pkey" PRIMARY KEY ("id")
);
