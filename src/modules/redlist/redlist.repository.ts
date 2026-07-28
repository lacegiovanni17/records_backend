import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RedlistCase,
  CaseStatus,
  CaseEntity,
  CaseEvidence,
  EvidenceSourceType,
  EvidenceConfidence,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RedlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Insert a new redlist case (tx-aware for atomic creation flows)
  async create(
    data: Prisma.RedlistCaseUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RedlistCase> {
    return (tx ?? this.prisma).redlistCase.create({ data });
  }

  // Fetch a case by id
  async findById(id: string): Promise<RedlistCase | null> {
    return this.prisma.redlistCase.findUnique({ where: { id } });
  }

  // Apply a partial update to a case
  async update(
    id: string,
    data: Prisma.RedlistCaseUpdateInput,
  ): Promise<RedlistCase> {
    return this.prisma.redlistCase.update({ where: { id }, data });
  }

  // Fetch a filtered/sorted page of cases plus a total count, in one snapshot
  async findManyWithCount(params: {
    where: Prisma.RedlistCaseWhereInput;
    orderBy: Prisma.RedlistCaseOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<[RedlistCase[], number]> {
    const { where, orderBy, skip, take } = params;
    return this.prisma.$transaction([
      this.prisma.redlistCase.findMany({ where, orderBy, skip, take }),
      this.prisma.redlistCase.count({ where }),
    ]);
  }

  // Status change + history + return refs — now INTERACTIVE so derivation can join
  async changeStatusTx(
    tx: Prisma.TransactionClient,
    id: string,
    status: CaseStatus,
    changedByAdminId: string,
    note?: string,
  ): Promise<RedlistCase> {
    const updated = await tx.redlistCase.update({
      where: { id },
      data: {
        status,
        resolutionDate: status === 'RESOLVED' ? new Date() : undefined,
      },
    });
    await tx.caseStatusHistory.create({
      data: { caseId: id, status, changedByAdminId, note },
    });
    return updated;
  }

  // ── CaseEntity (tx-aware) ──
  // Link an entity to a case
  async createEntity(
    data: Prisma.CaseEntityUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CaseEntity> {
    return (tx ?? this.prisma).caseEntity.create({ data });
  }

  // Remove an entity link by id
  async deleteEntity(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).caseEntity.delete({ where: { id } });
  }

  // Fetch a single entity-link row by id
  async findEntityById(id: string): Promise<CaseEntity | null> {
    return this.prisma.caseEntity.findUnique({ where: { id } });
  }

  // Find an existing link between a case and a specific company/individual (duplicate check)
  async findEntityLink(
    caseId: string,
    companyId: string | null,
    individualId: string | null,
  ) {
    return this.prisma.caseEntity.findFirst({
      where: { caseId, companyId, individualId },
    });
  }

  // List a case's entity links with company/individual joined in
  async findEntitiesByCase(caseId: string) {
    return this.prisma.caseEntity.findMany({
      where: { caseId },
      include: { company: true, individual: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // List just the company/individual ids linked to a case (for flag recomputation)
  async findEntityRefsByCase(caseId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).caseEntity.findMany({
      where: { caseId },
      select: { companyId: true, individualId: true },
    });
  }

  // ── Derivation counts (tx-aware) ──
  // Count a company's non-resolved, non-deleted cases (drives its FLAGGED status)
  async countActiveCasesForCompany(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).caseEntity.count({
      where: {
        companyId,
        case: { status: { not: 'RESOLVED' }, deletedAt: null },
      },
    });
  }

  // Count an individual's non-resolved, non-deleted cases (drives their FLAGGED status)
  async countActiveCasesForIndividual(
    individualId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).caseEntity.count({
      where: {
        individualId,
        case: { status: { not: 'RESOLVED' }, deletedAt: null },
      },
    });
  }

  // repository — a case WITH its entities joined
  async findByIdWithEntities(id: string) {
    return this.prisma.redlistCase.findUnique({
      where: { id },
      include: {
        entities: { include: { company: true, individual: true } },
      },
    });
  }

  // Insert a new evidence row (document or source link)
  async createEvidence(
    data: Prisma.CaseEvidenceUncheckedCreateInput,
  ): Promise<CaseEvidence> {
    return this.prisma.caseEvidence.create({ data });
  }

  // Fetch a single evidence row by id
  async findEvidenceById(id: string): Promise<CaseEvidence | null> {
    return this.prisma.caseEvidence.findUnique({ where: { id } });
  }

  // List a case's evidence, optionally filtered by classification and confidence
  async findEvidenceByCase(
    caseId: string,
    filters: {
      sourceClassification?: EvidenceSourceType;
      confidence?: EvidenceConfidence;
    },
  ): Promise<CaseEvidence[]> {
    const where: Prisma.CaseEvidenceWhereInput = { caseId };
    if (filters.sourceClassification)
      where.sourceClassification = filters.sourceClassification;
    if (filters.confidence) where.confidence = filters.confidence;

    return this.prisma.caseEvidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Hard-delete an evidence row (history preserved in the audit log)
  async deleteEvidence(id: string): Promise<void> {
    await this.prisma.caseEvidence.delete({ where: { id } });
  }
  // Soft-deletes a redlist case by stamping deletedAt/deletedBy
  async softDeleteCase(
    id: string,
    deletedBy: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RedlistCase> {
    return (tx ?? this.prisma).redlistCase.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  // Restores a soft-deleted redlist case by clearing deletedAt/deletedBy
  async restoreCase(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RedlistCase> {
    return (tx ?? this.prisma).redlistCase.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
  }

  // Returns all non-deleted cases linked to a company (for aggregation counts)
  async findCasesForCompanyAggregation(
    companyId: string,
  ): Promise<RedlistCase[]> {
    return this.prisma.redlistCase.findMany({
      where: { deletedAt: null, entities: { some: { companyId } } },
    });
  }
}
