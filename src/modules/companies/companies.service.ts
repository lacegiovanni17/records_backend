import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { CompanyRepository } from './repositories/company.repository';
import { CountriesService } from '../countries/countries.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  CreateCompanyDto,
  FlagCompanyDto,
  QueryCompaniesDto,
  UpdateCompanyDto,
} from './dto/company.dto';
import { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { CompanySort } from './enums/company-query.enum';
import { RiskLevel } from '../../shared/enums/risk-level.enum';
import { StorageService } from '../../infrastructure/storage/storage.service';
import type {} from 'multer';
import { IndustriesService } from '../industries/industries.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly countriesService: CountriesService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly industriesService: IndustriesService,
  ) {}

  // Creates a company: validates country + industry, uploads optional logo, persists, and audits
  async createCompany(
    dto: CreateCompanyDto,
    actor: AuthenticatedUser,
    file?: Express.Multer.File,
  ): Promise<Company> {
    // 1. Validate country + resolve name from the single source of truth.
    const country = this.countriesService.findByCode(dto.countryCode);
    if (!this.industriesService.isValid(dto.industry)) {
      throw new BadRequestException('Invalid industry.');
    }
    const industry = this.industriesService.resolve(dto.industry);
    // 2. Reject duplicate registration numbers with a clean 409
    const existing = await this.companyRepository.findByRegistrationNumber(
      dto.registrationNumber,
    );
    if (existing) {
      throw new ConflictException(
        'A company with this registration number already exists.',
      );
    }
    // 3. If a logo file was sent, upload it (PUBLIC tier) and capture the URL
    let logoUrl: string | undefined;
    if (file) {
      const result = await this.storageService.upload(file, { isPublic: true });
      logoUrl = result.url ?? undefined;
    }
    // 4. Create — server sets countryName + logoUrl; defaults handle status/risk/redlist
    const company = await this.companyRepository.create({
      name: dto.name,
      registrationNumber: dto.registrationNumber,
      countryCode: country.code,
      countryName: country.name,
      industry: industry,
      companyType: dto.companyType,
      incorporationDate: new Date(dto.incorporationDate),
      email: dto.email,
      registeredAddress: dto.registeredAddress,
      phone: dto.phone,
      website: dto.website,
      foundedDate: dto.foundedDate ? new Date(dto.foundedDate) : undefined,
      marketCap: dto.marketCap,
      logoUrl, // ← from the uploaded file, NOT dto
      about: dto.about,
      regulatoryAuthority: dto.regulatoryAuthority,
    });
    // 5. Audit the creation
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_CREATED,
      targetType: 'Company',
      targetId: company.id,
      metadata: {
        name: company.name,
        registrationNumber: company.registrationNumber,
      },
    });
    this.logger.log(`Company created → ${company.name} by ${actor.email}`);
    return company;
  }

  // Updates a company: validates industry/country if changed, applies a before/after diff, and audits
  async updateCompany(
    id: string,
    dto: UpdateCompanyDto,
    actor: AuthenticatedUser,
  ): Promise<Company> {
    const before = await this.findOne(id); // existence + not-deleted guard
    // Validate industry if it's being changed
    if (dto.industry && !this.industriesService.isValid(dto.industry)) {
      throw new BadRequestException('Invalid industry.');
    }
    // Resolve country if it's being changed (keep code+name in sync)
    const data: Prisma.CompanyUpdateInput = { ...dto };
    if (dto.industry)
      data.industry = this.industriesService.resolve(dto.industry);
    if (dto.countryCode) {
      const country = this.countriesService.findByCode(dto.countryCode);
      data.countryCode = country.code;
      data.countryName = country.name;
    }
    if (dto.incorporationDate)
      data.incorporationDate = new Date(dto.incorporationDate);
    if (dto.foundedDate) data.foundedDate = new Date(dto.foundedDate);
    const after = await this.companyRepository.update(id, data);
    const changes = this.buildDiff(
      before,
      after,
      Object.keys(dto) as (keyof Company)[],
    );
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_UPDATED,
      targetType: 'Company',
      targetId: id,
      metadata: { changes }, // full before/after diff
    });
    this.logger.log(`Company updated → ${id} by ${actor.email}`);
    return after;
  }

  async list(query: QueryCompaniesDto): Promise<{
    data: Company[];
    count: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25; // matches your Figma's "25 rows per page"
    const skip = (page - 1) * limit;

    const [data, count] = await this.companyRepository.findManyWithCount({
      where: this.buildWhere(query),
      orderBy: this.buildOrderBy(query.sort),
      skip,
      take: limit,
    });

    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async flag(
    id: string,
    dto: FlagCompanyDto,
    actor: AuthenticatedUser,
  ): Promise<Company> {
    const company = await this.findOne(id);
    if (company.redlistStatus === 'FLAGGED') {
      throw new BadRequestException('Company is already flagged.');
    }

    const updated = await this.companyRepository.update(id, {
      redlistStatus: 'FLAGGED',
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_FLAGGED,
      targetType: 'Company',
      targetId: id,
      metadata: { reason: dto.reason }, // why it was flagged — KYC-critical
    });

    return updated;
  }

  async unflag(
    id: string,
    dto: FlagCompanyDto,
    actor: AuthenticatedUser,
  ): Promise<Company> {
    const company = await this.findOne(id);
    if (company.redlistStatus === 'CLEAN') {
      throw new BadRequestException('Company is not flagged.');
    }

    const updated = await this.companyRepository.update(id, {
      redlistStatus: 'CLEAN',
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_UNFLAGGED,
      targetType: 'Company',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<Company> {
    const company = await this.findOne(id);
    if (company.archivedAt) {
      throw new BadRequestException('Company is already archived.');
    }

    const updated = await this.companyRepository.update(id, {
      archivedAt: new Date(),
      archivedBy: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_ARCHIVED,
      targetType: 'Company',
      targetId: id,
    });

    return updated;
  }

  async unarchive(id: string, actor: AuthenticatedUser): Promise<Company> {
    const company = await this.findOne(id);
    if (!company.archivedAt) {
      throw new BadRequestException('Company is not archived.');
    }

    const updated = await this.companyRepository.update(id, {
      archivedAt: null,
      archivedBy: null,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_UNARCHIVED,
      targetType: 'Company',
      targetId: id,
    });

    return updated;
  }

  async softDelete(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.findOne(id); // 404 if already deleted (findOne treats deleted as gone)

    await this.companyRepository.update(id, {
      deletedAt: new Date(),
      deletedBy: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_SOFT_DELETED,
      targetType: 'Company',
      targetId: id,
    });

    return { message: 'Company deleted.' };
  }

  async restore(id: string, actor: AuthenticatedUser): Promise<Company> {
    // Can't use findOne — it 404s on deleted rows. Fetch raw.
    const company = await this.companyRepository.findById(id);
    if (!company) throw new NotFoundException('Company not found.');
    if (!company.deletedAt)
      throw new BadRequestException('Company is not deleted.');

    const updated = await this.companyRepository.update(id, {
      deletedAt: null,
      deletedBy: null,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_RESTORED,
      targetType: 'Company',
      targetId: id,
    });

    return updated;
  }

  async getActivity(id: string, page?: number, limit?: number) {
    await this.findOne(id); // 404 if company missing/deleted
    return this.auditService.getEntityActivity('Company', id, page, limit);
  }

  private buildWhere(query: QueryCompaniesDto): Prisma.CompanyWhereInput {
    // Default view ALWAYS excludes archived + soft-deleted
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      archivedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { registrationNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.riskLevel) where.riskScore = this.riskRange(query.riskLevel);
    if (query.verificationStatus)
      where.verificationStatus = query.verificationStatus;
    if (query.redlistStatus) where.redlistStatus = query.redlistStatus;
    if (query.industry) where.industry = query.industry;
    if (query.country) where.countryCode = query.country.toUpperCase();

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
    sort?: CompanySort,
  ): Prisma.CompanyOrderByWithRelationInput {
    switch (sort) {
      case CompanySort.OLDEST:
        return { createdAt: 'asc' };
      case CompanySort.ALPHABETICAL:
        return { name: 'asc' };
      case CompanySort.RISK_HIGH:
        return { riskScore: 'desc' };
      case CompanySort.RISK_LOW:
        return { riskScore: 'asc' };
      case CompanySort.LAST_UPDATED:
        return { updatedAt: 'desc' };
      default:
        return { createdAt: 'desc' }; // NEWEST
    }
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);
    // Treat soft-deleted as non-existent — a deleted company is not "found"
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }
    return company;
  }

  private buildDiff(
    before: Company,
    after: Company,
    fields: (keyof Company)[],
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
