import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CaseEntity, CaseEvidence, Prisma, RedlistCase } from '@prisma/client';
import { RedlistRepository } from './redlist.repository';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  CreateCaseDto,
  UpdateCaseDto,
  ChangeCaseStatusDto,
  QueryCasesDto,
  RedlistSort,
  LinkEntityDto,
  AddEvidenceDto,
} from './dto/redlist.dto';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { RedlistDerivationService } from './redlist-derivation.service';
import { CompanyRepository } from '../companies/repositories/company.repository';
import { IndividualRepository } from '../individuals/repositories/individual.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { DOCUMENT_URL_EXPIRY_SECONDS } from '../documents/document.constants'; // reuse the 25-min constant
import { EvidenceSourceType, EvidenceConfidence } from '@prisma/client';

@Injectable()
export class RedlistService {
  private readonly logger = new Logger(RedlistService.name);

  constructor(
    private readonly redlistRepository: RedlistRepository,
    private readonly auditService: AuditService,
    private readonly derivation: RedlistDerivationService,
    private readonly companyRepository: CompanyRepository,
    private readonly individualRepository: IndividualRepository,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    dto: CreateCaseDto,
    actor: AuthenticatedUser,
  ): Promise<RedlistCase> {
    // ── Pre-transaction validation (reads) ──
    const wantsLink = !!dto.companyId || !!dto.individualId;

    if (wantsLink) {
      // Exactly one entity
      if (!!dto.companyId === !!dto.individualId) {
        throw new BadRequestException(
          'Provide exactly one of companyId or individualId to link.',
        );
      }
      // Role required when linking
      if (!dto.roleInCase) {
        throw new BadRequestException(
          'roleInCase is required when linking an entity on create.',
        );
      }
      // Referenced entity must exist + be live
      if (dto.companyId) {
        const c = await this.companyRepository.findById(dto.companyId);
        if (!c || c.deletedAt)
          throw new NotFoundException('Company not found.');
      } else {
        const i = await this.individualRepository.findById(dto.individualId!);
        if (!i || i.deletedAt)
          throw new NotFoundException('Individual not found.');
      }
    }

    // ── ATOMIC: case row + initial status-history (+ optional entity link + flag) ──
    const created = await this.prisma.$transaction(async (tx) => {
      const c = await this.redlistRepository.create(
        {
          title: dto.title,
          category: dto.category,
          severity: dto.severity,
          caseReference: dto.caseReference,
          summary: dto.summary,
          jurisdiction: dto.jurisdiction,
          legalBasis: dto.legalBasis,
          authority: dto.authority,
          sourceName: dto.sourceName,
          sourceUrl: dto.sourceUrl,
          incidentDate: dto.incidentDate
            ? new Date(dto.incidentDate)
            : undefined,
          filedDate: dto.filedDate ? new Date(dto.filedDate) : undefined,
          assignedToAdminId: dto.assignedToAdminId,
          createdByAdminId: actor.id,
        },
        tx,
      );

      // Initial status-history row (case origin)
      await tx.caseStatusHistory.create({
        data: {
          caseId: c.id,
          status: c.status,
          changedByAdminId: actor.id,
          note: 'Case created',
        },
      });

      // Optional initial entity link (company-context creation)
      if (wantsLink) {
        await this.redlistRepository.createEntity(
          {
            caseId: c.id,
            companyId: dto.companyId,
            individualId: dto.individualId,
            roleInCase: dto.roleInCase!,
            addedByAdminId: actor.id,
          },
          tx,
        );

        // Recompute the linked entity's redlistStatus in the SAME transaction
        if (dto.companyId) await this.derivation.syncCompany(dto.companyId, tx);
        else await this.derivation.syncIndividual(dto.individualId!, tx);
      }

      return c;
    });

    // ── Audit (post-commit — never rolls back the mutation) ──
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_CASE_CREATED,
      targetType: 'RedlistCase',
      targetId: created.id,
      metadata: {
        title: created.title,
        category: created.category,
        severity: created.severity,
        linkedCompanyId: dto.companyId ?? null,
        linkedIndividualId: dto.individualId ?? null,
      },
    });

    // Separate audit for the link, if one was made — keeps the entity-linked event discoverable
    if (wantsLink) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: AuditAction.REDLIST_ENTITY_LINKED,
        targetType: 'RedlistCase',
        targetId: created.id,
        metadata: {
          companyId: dto.companyId ?? null,
          individualId: dto.individualId ?? null,
          roleInCase: dto.roleInCase,
        },
      });
    }

    this.logger.log(
      `Redlist case created → ${created.title} by ${actor.email}`,
    );
    const full = await this.redlistRepository.findByIdWithEntities(created.id);
    return full!;
  }

  async listCasesForCompany(companyId: string, query: QueryCasesDto) {
    return this.listForEntity({ companyId }, query);
  }

  async listCasesForIndividual(individualId: string, query: QueryCasesDto) {
    return this.listForEntity({ individualId }, query);
  }

  private async listForEntity(
    scope: { companyId?: string; individualId?: string },
    query: QueryCasesDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.RedlistCaseWhereInput = {
      deletedAt: null,
      entities: {
        some: scope.companyId
          ? { companyId: scope.companyId }
          : { individualId: scope.individualId },
      },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { caseReference: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status; // ← your CaseStatus enum

    const [data, count] = await this.redlistRepository.findManyWithCount({
      where,
      orderBy: this.buildOrderBy(query.sort),
      skip,
      take: limit,
    });
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async findCaseById(id: string): Promise<RedlistCase> {
    const c = await this.redlistRepository.findById(id);
    if (!c || c.deletedAt) throw new NotFoundException('Case not found.');
    return c;
  }

  async list(query: QueryCasesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.RedlistCaseWhereInput = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { caseReference: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;

    const [data, count] = await this.redlistRepository.findManyWithCount({
      where,
      orderBy: this.buildOrderBy(query.sort),
      skip,
      take: limit,
    });
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async update(
    id: string,
    dto: UpdateCaseDto,
    actor: AuthenticatedUser,
  ): Promise<RedlistCase> {
    const before = await this.findCaseById(id);

    const data: Prisma.RedlistCaseUpdateInput = { ...dto };
    if (dto.incidentDate) data.incidentDate = new Date(dto.incidentDate);
    if (dto.filedDate) data.filedDate = new Date(dto.filedDate);

    const after = await this.redlistRepository.update(id, data);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(dto) as (keyof RedlistCase)[]) {
      if (before[k]?.toString() !== after[k]?.toString()) {
        changes[k] = { from: before[k], to: after[k] };
      }
    }

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_CASE_UPDATED,
      targetType: 'RedlistCase',
      targetId: id,
      metadata: { changes },
    });
    return after;
  }

  async linkEntity(
    caseId: string,
    dto: LinkEntityDto,
    actor: AuthenticatedUser,
  ): Promise<CaseEntity> {
    await this.findCaseById(caseId);

    const hasCompany = !!dto.companyId;
    const hasIndividual = !!dto.individualId;
    if (hasCompany === hasIndividual) {
      throw new BadRequestException(
        'Provide exactly one of companyId or individualId.',
      );
    }

    if (dto.companyId) {
      const c = await this.companyRepository.findById(dto.companyId);
      if (!c || c.deletedAt) throw new NotFoundException('Company not found.');
    } else {
      const i = await this.individualRepository.findById(dto.individualId!);
      if (!i || i.deletedAt)
        throw new NotFoundException('Individual not found.');
    }

    const existing = await this.redlistRepository.findEntityLink(
      caseId,
      dto.companyId ?? null,
      dto.individualId ?? null,
    );
    if (existing)
      throw new ConflictException('Entity already linked to this case.');

    // ── ATOMIC: create link + recompute flag in one transaction ──
    const link = await this.prisma.$transaction(async (tx) => {
      const created = await this.redlistRepository.createEntity(
        {
          caseId,
          companyId: dto.companyId,
          individualId: dto.individualId,
          roleInCase: dto.roleInCase,
          addedByAdminId: actor.id,
        },
        tx,
      );

      if (dto.companyId) await this.derivation.syncCompany(dto.companyId, tx);
      else await this.derivation.syncIndividual(dto.individualId!, tx);

      return created;
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_ENTITY_LINKED,
      targetType: 'RedlistCase',
      targetId: caseId,
      metadata: {
        companyId: dto.companyId ?? null,
        individualId: dto.individualId ?? null,
        roleInCase: dto.roleInCase,
      },
    });

    return link;
  }

  async unlinkEntity(
    caseId: string,
    entityLinkId: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findCaseById(caseId);

    const link = await this.redlistRepository.findEntityById(entityLinkId);
    if (!link || link.caseId !== caseId) {
      throw new NotFoundException('Entity link not found on this case.');
    }

    // Snapshot BEFORE delete (hard delete — history in audit)
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_ENTITY_UNLINKED,
      targetType: 'RedlistCase',
      targetId: caseId,
      metadata: {
        companyId: link.companyId,
        individualId: link.individualId,
        roleInCase: link.roleInCase,
      },
    });

    // ── ATOMIC: delete + recompute (recount remaining cases) ──
    await this.prisma.$transaction(async (tx) => {
      await this.redlistRepository.deleteEntity(entityLinkId, tx);
      if (link.companyId) await this.derivation.syncCompany(link.companyId, tx);
      if (link.individualId)
        await this.derivation.syncIndividual(link.individualId, tx);
    });

    return { message: 'Entity unlinked from case.' };
  }

  async changeStatus(
    id: string,
    dto: ChangeCaseStatusDto,
    actor: AuthenticatedUser,
  ): Promise<RedlistCase> {
    const before = await this.findCaseById(id);
    if (before.status === dto.status) {
      throw new BadRequestException(`Case is already ${dto.status}.`);
    }

    // ── ATOMIC: status + history + recompute ALL entities ──
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.redlistRepository.changeStatusTx(
        tx,
        id,
        dto.status,
        actor.id,
        dto.note,
      );
      await this.derivation.syncAllEntitiesOnCase(id, tx); // resolve/reopen re-flags every entity
      return result;
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_CASE_STATUS_CHANGED,
      targetType: 'RedlistCase',
      targetId: id,
      metadata: { from: before.status, to: dto.status, note: dto.note ?? null },
    });

    this.logger.log(
      `Case ${id} status ${before.status} → ${dto.status} by ${actor.email}`,
    );
    return updated;
  }

  async listEntities(caseId: string) {
    await this.findCaseById(caseId);
    const links = await this.redlistRepository.findEntitiesByCase(caseId);

    return links.map((link) => ({
      linkId: link.id,
      roleInCase: link.roleInCase,
      addedByAdminId: link.addedByAdminId,
      addedAt: link.createdAt,
      entityKind: link.companyId ? 'COMPANY' : 'INDIVIDUAL',
      company: link.company
        ? {
            id: link.company.id,
            name: link.company.name,
            riskScore: link.company.riskScore,
            verificationStatus: link.company.verificationStatus,
            redlistStatus: link.company.redlistStatus,
          }
        : null,
      individual: link.individual
        ? {
            id: link.individual.id,
            firstName: link.individual.firstName,
            lastName: link.individual.lastName,
            riskScore: link.individual.riskScore,
            redlistStatus: link.individual.redlistStatus,
          }
        : null,
    }));
  }

  async addEvidence(
    caseId: string,
    dto: AddEvidenceDto,
    actor: AuthenticatedUser,
    file?: Express.Multer.File,
  ): Promise<CaseEvidence> {
    await this.findCaseById(caseId); // 404 if case missing/deleted

    // Enforce kind ↔ payload (the XOR, at service level; DB check backs it)
    let fileKey: string | undefined;
    let fileName: string | undefined;
    let url: string | undefined;

    if (dto.kind === 'DOCUMENT') {
      if (!file) {
        throw new BadRequestException(
          'A file is required for DOCUMENT evidence.',
        );
      }
      const result = await this.storageService.upload(file, {
        isPublic: false,
      }); // private
      fileKey = result.key;
      fileName = file.originalname;
    } else {
      // kind === LINK
      if (!dto.url) {
        throw new BadRequestException('A url is required for LINK evidence.');
      }
      url = dto.url;
    }

    const evidence = await this.redlistRepository.createEvidence({
      caseId,
      name: dto.name,
      kind: dto.kind,
      confidence: dto.confidence,
      sourceClassification: dto.sourceClassification,
      fileKey,
      fileName,
      url,
      addedByAdminId: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_EVIDENCE_ADDED,
      targetType: 'RedlistCase',
      targetId: caseId,
      metadata: { evidenceId: evidence.id, name: dto.name, kind: dto.kind },
    });

    this.logger.log(
      `Evidence added → ${dto.name} (${dto.kind}) to case ${caseId} by ${actor.email}`,
    );
    return evidence;
  }

  async listEvidence(
    caseId: string,
    filters: {
      sourceClassification?: EvidenceSourceType;
      confidence?: EvidenceConfidence;
    },
  ) {
    await this.findCaseById(caseId);
    return this.redlistRepository.findEvidenceByCase(caseId, filters);
  }

  async getEvidenceViewUrl(
    caseId: string,
    evidenceId: string,
    actor: AuthenticatedUser,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    await this.findCaseById(caseId);

    const evidence = await this.redlistRepository.findEvidenceById(evidenceId);
    if (!evidence || evidence.caseId !== caseId) {
      throw new NotFoundException('Evidence not found on this case.');
    }
    if (evidence.kind !== 'DOCUMENT' || !evidence.fileKey) {
      throw new BadRequestException(
        'This evidence is a link, not a viewable document.',
      );
    }

    const url = await this.storageService.getSignedReadUrl(
      evidence.fileKey,
      DOCUMENT_URL_EXPIRY_SECONDS, // 25 min
    );

    // Audit every private-evidence access (who/when/which)
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.DOCUMENT_ACCESSED, // reuse — or add REDLIST_EVIDENCE_ACCESSED (see note)
      targetType: 'CaseEvidence',
      targetId: evidenceId,
      metadata: { caseId, name: evidence.name },
    });

    return { url, expiresInSeconds: DOCUMENT_URL_EXPIRY_SECONDS };
  }

  async removeEvidence(
    caseId: string,
    evidenceId: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findCaseById(caseId);

    const evidence = await this.redlistRepository.findEvidenceById(evidenceId);
    if (!evidence || evidence.caseId !== caseId) {
      throw new NotFoundException('Evidence not found on this case.');
    }

    // Snapshot BEFORE hard delete — history lives in audit
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_EVIDENCE_REMOVED,
      targetType: 'RedlistCase',
      targetId: caseId,
      metadata: {
        evidenceId,
        name: evidence.name,
        kind: evidence.kind,
        fileKey: evidence.fileKey,
        url: evidence.url,
      },
    });

    await this.redlistRepository.deleteEvidence(evidenceId);

    this.logger.log(
      `Evidence removed → ${evidence.name} from case ${caseId} by ${actor.email}`,
    );
    return { message: 'Evidence removed.' };
  }

  // Soft-deletes a case and clears the redlist flag on all its linked entities
  async softDeleteCase(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findCaseById(id); // 404 if already deleted

    // ── ATOMIC: soft-delete + recompute all linked entities' flags ──
    await this.prisma.$transaction(async (tx) => {
      await this.redlistRepository.softDeleteCase(id, actor.id, tx);
      await this.derivation.syncAllEntitiesOnCase(id, tx); // deleted case no longer flags
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_CASE_DELETED,
      targetType: 'RedlistCase',
      targetId: id,
    });

    this.logger.log(`Redlist case soft-deleted → ${id} by ${actor.email}`);
    return { message: 'Case deleted.' };
  }

  // Restores a soft-deleted case and re-applies the redlist flag if the case is still active
  async restoreCase(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<RedlistCase> {
    // Bypass findCaseById — it 404s on deleted rows, and restore needs exactly those
    const c = await this.redlistRepository.findById(id);
    if (!c) throw new NotFoundException('Case not found.');
    if (!c.deletedAt) throw new BadRequestException('Case is not deleted.');

    // ── ATOMIC: restore + recompute (a restored non-RESOLVED case re-flags) ──
    const restored = await this.prisma.$transaction(async (tx) => {
      const r = await this.redlistRepository.restoreCase(id, tx);
      await this.derivation.syncAllEntitiesOnCase(id, tx);
      return r;
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.REDLIST_CASE_RESTORED,
      targetType: 'RedlistCase',
      targetId: id,
    });

    return restored;
  }

  // Builds the redlist panel summary for a company: total + counts by severity and status
  async getCompanyRedlistSummary(companyId: string) {
    const cases =
      await this.redlistRepository.findCasesForCompanyAggregation(companyId);

    const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byStatus = {
      UNDER_INVESTIGATION: 0,
      ALLEGED: 0,
      CHARGED: 0,
      CONVICTED: 0,
      RESOLVED: 0,
    };

    for (const c of cases) {
      bySeverity[c.severity]++;
      byStatus[c.status]++;
    }

    const active = cases.filter((c) => c.status !== 'RESOLVED').length;

    return {
      total: cases.length,
      active,
      resolved: byStatus.RESOLVED,
      bySeverity,
      byStatus,
    };
  }

  private buildOrderBy(
    sort?: RedlistSort,
  ): Prisma.RedlistCaseOrderByWithRelationInput {
    switch (sort) {
      case RedlistSort.OLDEST:
        return { createdAt: 'asc' };
      case RedlistSort.SEVERITY_HIGH:
        return { severity: 'asc' }; // HIGH first (enum order)
      case RedlistSort.LAST_UPDATED:
        return { updatedAt: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}
