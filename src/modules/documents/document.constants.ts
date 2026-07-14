import { DocumentType, DocumentName } from '@prisma/client';

// Which document names belong to which type — guards mismatched pairs
export const DOCUMENT_NAME_BY_TYPE: Record<DocumentType, DocumentName[]> = {
  [DocumentType.CORPORATE]: [
    DocumentName.CERTIFICATE_OF_INCORPORATION,
    DocumentName.BUSINESS_REGISTRATION,
  ],
  [DocumentType.COMPLIANCE]: [
    DocumentName.TAX_CERTIFICATE,
    DocumentName.REGULATORY_FILINGS,
  ],
  [DocumentType.FINANCIALS]: [
    DocumentName.FINANCIAL_STATEMENT,
    DocumentName.AUDIT_REPORTS,
  ],
  [DocumentType.LEGAL]: [DocumentName.COURT_FILINGS, DocumentName.AGREEMENT],
};

export const DOCUMENT_URL_EXPIRY_SECONDS = 25 * 60; // 25 min presigned window
