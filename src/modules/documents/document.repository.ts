import { Injectable } from '@nestjs/common';
import { Document, DocumentRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Insert a new document row
  async create(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return this.prisma.document.create({ data });
  }

  // Fetch a document by id
  async findById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  // List a company's non-deleted documents, newest first
  async findByCompany(companyId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Apply a partial update to a document
  async update(
    id: string,
    data: Prisma.DocumentUpdateInput,
  ): Promise<Document> {
    return this.prisma.document.update({ where: { id }, data });
  }

  // ── DocumentRequest methods ──
  // Insert a new document request
  async createRequest(
    data: Prisma.DocumentRequestUncheckedCreateInput,
  ): Promise<DocumentRequest> {
    return this.prisma.documentRequest.create({ data });
  }

  // List a company's document requests, newest first
  async findRequestsByCompany(companyId: string): Promise<DocumentRequest[]> {
    return this.prisma.documentRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
