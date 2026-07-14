import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Individual, Prisma } from '@prisma/client';
import { IndividualRepository } from './repositories/individual.repository';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  CreateIndividualDto,
  FlagIndividualDto,
  UpdateIndividualDto,
} from './dto/individual.dto';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { RiskLevel } from '../../shared/enums/risk-level.enum';
import { IndividualSort } from './enums/individual-query.enum';
import { QueryIndividualsDto } from './dto/individual.dto';
import { PersonRole } from '@prisma/client';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Injectable()
export class IndividualsService {
  private readonly logger = new Logger(IndividualsService.name);

  constructor(
    private readonly individualRepository: IndividualRepository,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    dto: CreateIndividualDto,
    actor: AuthenticatedUser,
    file?: Express.Multer.File,
  ): Promise<Individual> {
    // Upload photo (PUBLIC tier) if one was sent
    let photoUrl: string | undefined;
    if (file) {
      const result = await this.storageService.upload(file, { isPublic: true });
      photoUrl = result.url ?? undefined;
    }

    const individual = await this.individualRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      nationality: dto.nationality,
      dateOfBirth: new Date(dto.dateOfBirth),
      photoUrl, // from the uploaded file, NOT dto
      about: dto.about,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_CREATED,
      targetType: 'Individual',
      targetId: individual.id,
      metadata: { name: `${individual.firstName} ${individual.lastName}` },
    });

    this.logger.log(
      `Individual created - ${individual.firstName} ${individual.lastName} by ${actor.email}`,
    );
    return individual;
  }

  async update(
    id: string,
    dto: UpdateIndividualDto,
    actor: AuthenticatedUser,
    file?: Express.Multer.File,
  ): Promise<Individual> {
    const before = await this.findOne(id);

    const data: Prisma.IndividualUpdateInput = { ...dto };
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);

    // If a new photo was sent, upload it and overwrite photoUrl
    if (file) {
      const result = await this.storageService.upload(file, { isPublic: true });
      data.photoUrl = result.url ?? undefined;
    }

    const after = await this.individualRepository.update(id, data);

    const changes = this.buildDiff(
      before,
      after,
      Object.keys(data) as (keyof Individual)[], // note: data, not dto — captures photoUrl change too
    );

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_UPDATED,
      targetType: 'Individual',
      targetId: id,
      metadata: { changes },
    });

    this.logger.log(`Individual updated → ${id} by ${actor.email}`);
    return after;
  }
  async flag(
    id: string,
    dto: FlagIndividualDto,
    actor: AuthenticatedUser,
  ): Promise<Individual> {
    const individual = await this.findOne(id);
    if (individual.redlistStatus === 'FLAGGED') {
      throw new BadRequestException('Individual is already flagged.');
    }

    const updated = await this.individualRepository.update(id, {
      redlistStatus: 'FLAGGED',
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_FLAGGED,
      targetType: 'Individual',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  async unflag(
    id: string,
    dto: FlagIndividualDto,
    actor: AuthenticatedUser,
  ): Promise<Individual> {
    const individual = await this.findOne(id);
    if (individual.redlistStatus === 'CLEAN') {
      throw new BadRequestException('Individual is not flagged.');
    }

    const updated = await this.individualRepository.update(id, {
      redlistStatus: 'CLEAN',
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_UNFLAGGED,
      targetType: 'Individual',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<Individual> {
    const individual = await this.findOne(id);
    if (individual.archivedAt) {
      throw new BadRequestException('Individual is already archived.');
    }

    const updated = await this.individualRepository.update(id, {
      archivedAt: new Date(),
      archivedBy: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_ARCHIVED,
      targetType: 'Individual',
      targetId: id,
    });

    return updated;
  }

  async unarchive(id: string, actor: AuthenticatedUser): Promise<Individual> {
    const individual = await this.findOne(id);
    if (!individual.archivedAt) {
      throw new BadRequestException('Individual is not archived.');
    }

    const updated = await this.individualRepository.update(id, {
      archivedAt: null,
      archivedBy: null,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_UNARCHIVED,
      targetType: 'Individual',
      targetId: id,
    });

    return updated;
  }

  async softDelete(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findOne(id); // 404 if already deleted

    await this.individualRepository.update(id, {
      deletedAt: new Date(),
      deletedBy: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_SOFT_DELETED,
      targetType: 'Individual',
      targetId: id,
    });

    return { message: 'Individual deleted.' };
  }

  async restore(id: string, actor: AuthenticatedUser): Promise<Individual> {
    // Bypass findOne — it 404s on deleted rows, and restore needs exactly those
    const individual = await this.individualRepository.findById(id);
    if (!individual) throw new NotFoundException('Individual not found.');
    if (!individual.deletedAt) {
      throw new BadRequestException('Individual is not deleted.');
    }

    const updated = await this.individualRepository.update(id, {
      deletedAt: null,
      deletedBy: null,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.INDIVIDUAL_RESTORED,
      targetType: 'Individual',
      targetId: id,
    });

    return updated;
  }

  async getIndividualCompanies(individualId: string) {
    // Confirm the person exists + is live
    await this.findOne(individualId); // 404 if missing/deleted

    const links =
      await this.individualRepository.findCompaniesByIndividual(individualId);

    // Flat list: company details + this person's role/ownership AT that company
    const companies = links.map((link) => ({
      linkId: link.id,
      companyId: link.company.id,
      name: link.company.name,
      countryName: link.company.countryName,
      industry: link.company.industry,
      logoUrl: link.company.logoUrl,
      riskScore: link.company.riskScore, // company-level
      verificationStatus: link.company.verificationStatus,
      redlistStatus: link.company.redlistStatus,
      // ── this person's relationship to that company ──
      roles: link.roles,
      isKeyPerson: link.isKeyPerson,
      ownershipPercentage: link.ownershipPercentage,
      appointedAt: link.appointedAt,
    }));

    // Bucketed counts for the preview panel
    const counts = {
      linkedCompanies: links.length,
      directorships: links.filter((l) => l.roles.includes(PersonRole.DIRECTOR))
        .length,
      shareholdings: links.filter((l) =>
        l.roles.includes(PersonRole.SHAREHOLDER),
      ).length,
      highRiskLinks: links.filter((l) => l.company.riskScore >= 71).length, // bonus — see below
    };

    return { data: companies, counts };
  }

  async findOne(id: string): Promise<Individual> {
    const individual = await this.individualRepository.findById(id);
    if (!individual || individual.deletedAt) {
      throw new NotFoundException('Individual not found.');
    }
    return individual;
  }

  async list(query: QueryIndividualsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [data, count] = await this.individualRepository.findManyWithCount({
      where: this.buildWhere(query),
      orderBy: this.buildOrderBy(query.sort),
      skip,
      take: limit,
    });

    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  private buildWhere(query: QueryIndividualsDto): Prisma.IndividualWhereInput {
    const where: Prisma.IndividualWhereInput = {
      deletedAt: null,
      archivedAt: null,
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { middleName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.riskLevel) where.riskScore = this.riskRange(query.riskLevel);
    if (query.verificationStatus)
      where.verificationStatus = query.verificationStatus;
    if (query.redlistStatus) where.redlistStatus = query.redlistStatus;

    return where;
  }

  private riskRange(level: RiskLevel): Prisma.IntFilter {
    switch (level) {
      case RiskLevel.LOW:
        return { gte: 0, lte: 40 };
      case RiskLevel.MEDIUM:
        return { gte: 41, lte: 70 };
      case RiskLevel.HIGH:
        return { gte: 71, lte: 100 };
    }
  }

  private buildOrderBy(
    sort?: IndividualSort,
  ): Prisma.IndividualOrderByWithRelationInput {
    switch (sort) {
      case IndividualSort.OLDEST:
        return { createdAt: 'asc' };
      case IndividualSort.ALPHABETICAL:
        return { firstName: 'asc' };
      case IndividualSort.RISK_HIGH:
        return { riskScore: 'desc' };
      case IndividualSort.RISK_LOW:
        return { riskScore: 'asc' };
      case IndividualSort.LAST_UPDATED:
        return { updatedAt: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  private buildDiff(
    before: Individual,
    after: Individual,
    fields: (keyof Individual)[],
  ): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of fields) {
      if (before[field]?.toString() !== after[field]?.toString()) {
        diff[field] = { from: before[field], to: after[field] };
      }
    }
    return diff;
  }
}
