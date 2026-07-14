import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Document, DocumentRequest } from '@prisma/client';
import { DocumentRepository } from './document.repository';
import { CompanyRepository } from '../companies/repositories/company.repository';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  RejectDocumentDto,
  RequestDocumentDto,
  UploadDocumentDto,
} from './dto/document.dto';
import { DOCUMENT_NAME_BY_TYPE } from './document.constants';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { DOCUMENT_URL_EXPIRY_SECONDS } from './document.constants';
import { DocumentType, DocumentName } from '@prisma/client';
import { AdminRepository } from '../auth/repositories/admin.repository';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly adminRepository: AdminRepository,
  ) {}

  async upload(
    companyId: string,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
  ): Promise<Document> {
    // 1. Company must exist + be live
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    // 2. A file is required for upload
    if (!file) {
      throw new BadRequestException('A document file is required.');
    }

    // 3. documentName must belong to documentType
    const validNames = DOCUMENT_NAME_BY_TYPE[dto.documentType];
    if (!validNames.includes(dto.documentName)) {
      throw new BadRequestException(
        `${dto.documentName} is not a valid document for type ${dto.documentType}.`,
      );
    }

    // 4. Upload to PRIVATE storage — KYC docs are never public
    const result = await this.storageService.upload(file, { isPublic: false });

    // 5. Persist (status defaults to PENDING; uploader captured)
    const document = await this.documentRepository.create({
      companyId,
      documentType: dto.documentType,
      documentName: dto.documentName,
      fileKey: result.key,
      fileName: file.originalname,
      source: dto.source,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      uploadedByAdminId: actor.id,
    });

    // 6. Audit
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_UPLOADED,
      targetType: 'Document',
      targetId: document.id,
      metadata: {
        companyId,
        documentType: dto.documentType,
        documentName: dto.documentName,
        fileName: file.originalname,
      },
    });

    this.logger.log(
      `Document uploaded → ${dto.documentName} for company ${companyId} by ${actor.email}`,
    );
    return document;
  }

  // Effective status: stored status, but VERIFIED + past-expiry → EXPIRED (derived)
  private deriveStatus(doc: Document): string {
    if (
      doc.status === 'VERIFIED' &&
      doc.expiresAt &&
      doc.expiresAt < new Date()
    ) {
      return 'EXPIRED';
    }
    return doc.status;
  }

  async listByCompany(companyId: string) {
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    const docs = await this.documentRepository.findByCompany(companyId);

    // Shape each uploaded doc with its effective (derived) status
    const uploaded = docs.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      documentName: doc.documentName,
      fileName: doc.fileName,
      source: doc.source,
      status: this.deriveStatus(doc), // ← EXPIRED computed here
      expiresAt: doc.expiresAt,
      verificationSource: doc.verificationSource,
      verifiedAt: doc.verifiedAt,
      uploadedByAdminId: doc.uploadedByAdminId,
      uploadedAt: doc.createdAt,
    }));

    const uploadedNames = new Set(docs.map((d) => d.documentName));
    const missing: {
      documentType: DocumentType;
      documentName: DocumentName;
    }[] = [];

    for (const type of Object.values(DocumentType)) {
      for (const name of DOCUMENT_NAME_BY_TYPE[type]) {
        if (!uploadedNames.has(name)) {
          missing.push({ documentType: type, documentName: name });
        }
      }
    }

    const grouped = Object.values(DocumentType).map((type) => ({
      documentType: type,
      documents: uploaded.filter((d) => d.documentType === type),
      missing: missing.filter((m) => m.documentType === type),
    }));

    return {
      grouped,
      missingCount: missing.length,
      totalUploaded: uploaded.length,
    };
  }

  async getViewUrl(
    documentId: string,
    actor: AuthenticatedUser,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Document not found.');
    }

    // Mint a time-limited URL (25 min) for this private file
    const url = await this.storageService.getSignedReadUrl(
      doc.fileKey,
      DOCUMENT_URL_EXPIRY_SECONDS,
    );

    // KYC-critical: audit WHO viewed WHICH document and WHEN
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_ACCESSED,
      targetType: 'Document',
      targetId: documentId,
      metadata: {
        companyId: doc.companyId,
        documentName: doc.documentName,
      },
    });

    this.logger.log(`Document accessed - ${documentId} by ${actor.email}`);
    return { url, expiresInSeconds: DOCUMENT_URL_EXPIRY_SECONDS };
  }

  // shared guard: fetch a live document or 404
  private async getLiveDocument(id: string): Promise<Document> {
    const doc = await this.documentRepository.findById(id);
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Document not found.');
    }
    return doc;
  }

  async verify(id: string, actor: AuthenticatedUser): Promise<Document> {
    const doc = await this.getLiveDocument(id);
    if (doc.status === 'VERIFIED') {
      throw new BadRequestException('Document is already verified.');
    }

    const updated = await this.documentRepository.update(id, {
      status: 'VERIFIED',
      verificationSource: 'ADMIN', // in-house verification
      verifiedByAdminId: actor.id,
      verifiedAt: new Date(),
      rejectionReason: null, // clear any prior rejection
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_VERIFIED,
      targetType: 'Document',
      targetId: id,
      metadata: { companyId: doc.companyId, documentName: doc.documentName },
    });

    this.logger.log(`Document verified → ${id} by ${actor.email}`);
    return updated;
  }

  async reject(
    id: string,
    dto: RejectDocumentDto,
    actor: AuthenticatedUser,
  ): Promise<Document> {
    const doc = await this.getLiveDocument(id);
    if (doc.status === 'REJECTED') {
      throw new BadRequestException('Document is already rejected.');
    }

    const updated = await this.documentRepository.update(id, {
      status: 'REJECTED',
      rejectionReason: dto.reason,
      rejectionReasonCode: dto.reasonCode ?? null,
      verifiedByAdminId: actor.id,
      verifiedAt: new Date(),
      verificationSource: 'ADMIN',
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_REJECTED,
      targetType: 'Document',
      targetId: id,
      metadata: {
        companyId: doc.companyId,
        documentName: doc.documentName,
        reason: dto.reason,
      },
    });

    this.logger.log(`Document rejected → ${id} by ${actor.email}`);
    return updated;
  }

  async getSummary(companyId: string) {
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    const docs = await this.documentRepository.findByCompany(companyId);

    // Total expected = full catalog (8)
    const totalExpected = Object.values(DocumentType).reduce(
      (sum, type) => sum + DOCUMENT_NAME_BY_TYPE[type].length,
      0,
    );

    // Single pass over uploaded docs, using derived effective status
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let expired = 0;

    for (const doc of docs) {
      switch (this.deriveStatus(doc)) {
        case 'VERIFIED':
          verified++;
          break;
        case 'PENDING':
          pending++;
          break;
        case 'REJECTED':
          rejected++;
          break;
        case 'EXPIRED':
          expired++;
          break;
      }
    }

    const totalUploaded = docs.length;
    const missing =
      totalExpected - new Set(docs.map((d) => d.documentName)).size;

    // Verification score: verified against the FULL expected catalog.
    // Missing docs drag the score down — an incomplete profile isn't 100%.
    const verificationScore =
      totalExpected === 0 ? 0 : Math.round((verified / totalExpected) * 100);

    return {
      verificationScore, // e.g. 90
      totalDocuments: totalUploaded,
      verified,
      pending,
      rejected,
      missing,
      expired,
    };
  }

  async requestDocument(
    companyId: string,
    dto: RequestDocumentDto,
    actor: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    // documentName must belong to documentType
    if (!DOCUMENT_NAME_BY_TYPE[dto.documentType].includes(dto.documentName)) {
      throw new BadRequestException(
        `${dto.documentName} is not a valid document for type ${dto.documentType}.`,
      );
    }

    // assignee must be a real admin (raw-string FK - validate manually)
    const assignee = await this.adminRepository.findById(dto.assignedToAdminId);
    if (!assignee) {
      throw new BadRequestException('Assigned admin does not exist.');
    }

    const request = await this.documentRepository.createRequest({
      companyId,
      documentType: dto.documentType,
      documentName: dto.documentName,
      assignedToAdminId: dto.assignedToAdminId,
      requestedByAdminId: actor.id,
      message: dto.message,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_REQUESTED,
      targetType: 'Company',
      targetId: companyId,
      metadata: {
        documentName: dto.documentName,
        assignedToAdminId: dto.assignedToAdminId,
        message: dto.message ?? null,
      },
    });

    // TODO LATER: notification stub — wire email/in-app when notifications module exists
    this.logger.log(
      `Document requested → ${dto.documentName} assigned to ${dto.assignedToAdminId} by ${actor.email}`,
    );
    return request;
  }

  async listRequests(companyId: string): Promise<DocumentRequest[]> {
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }
    return this.documentRepository.findRequestsByCompany(companyId);
  }
}
