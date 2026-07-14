import { Injectable } from '@nestjs/common';
import { Document, DocumentRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return this.prisma.document.create({ data });
  }

  async findById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async findByCompany(companyId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.DocumentUpdateInput,
  ): Promise<Document> {
    return this.prisma.document.update({ where: { id }, data });
  }

  // ── DocumentRequest methods ──
  async createRequest(
    data: Prisma.DocumentRequestUncheckedCreateInput,
  ): Promise<DocumentRequest> {
    return this.prisma.documentRequest.create({ data });
  }

  async findRequestsByCompany(companyId: string): Promise<DocumentRequest[]> {
    return this.prisma.documentRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
