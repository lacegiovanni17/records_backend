/*
  Warnings:

  - The values [ILLEGIBLE,EXPIRED,MISMATCH,INCOMPLETE,OTHER] on the enum `RejectionReasonCode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RejectionReasonCode_new" AS ENUM ('INVALID_DOCUMENT', 'UNREADABLE_DOCUMENT', 'INCOMPLETE_DOCUMENT', 'MISSING_REQUIRED_PAGES', 'DOCUMENT_EXPIRED', 'NAME_MISMATCH', 'REGISTRATION_NUMBER_MISMATCH', 'DETAILS_MISMATCH', 'UNRECOGNIZED_AUTHORITY', 'UNABLE_TO_VERIFY_SOURCE', 'SUSPECTED_FRAUDULENT', 'INCORRECT_DOCUMENT', 'MISSING_SUPPORTING_DOCUMENT');
ALTER TABLE "Document" ALTER COLUMN "rejectionReasonCode" TYPE "RejectionReasonCode_new" USING ("rejectionReasonCode"::text::"RejectionReasonCode_new");
ALTER TYPE "RejectionReasonCode" RENAME TO "RejectionReasonCode_old";
ALTER TYPE "RejectionReasonCode_new" RENAME TO "RejectionReasonCode";
DROP TYPE "public"."RejectionReasonCode_old";
COMMIT;
