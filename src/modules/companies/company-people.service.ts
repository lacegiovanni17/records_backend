import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CompanyIndividual, Prisma } from '@prisma/client';
import { CompanyIndividualRepository } from './repositories/company-individual.repository';
import { CompanyRepository } from './repositories/company.repository';
import { IndividualRepository } from '../individuals/repositories/individual.repository';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { LinkPersonDto, UpdateLinkDto } from './dto/company.dto';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';

export type CompanyIndividualWithPerson = Prisma.CompanyIndividualGetPayload<{
  include: { individual: true };
}>;

@Injectable()
export class CompanyPeopleService {
  private readonly logger = new Logger(CompanyPeopleService.name);

  constructor(
    private readonly linkRepository: CompanyIndividualRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly individualRepository: IndividualRepository,
    private readonly auditService: AuditService,
  ) {}

  async linkPerson(
    companyId: string,
    dto: LinkPersonDto,
    actor: AuthenticatedUser,
  ): Promise<CompanyIndividual> {
    // 1. Both ends must exist and be live
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }
    const individual = await this.individualRepository.findById(
      dto.individualId,
    );
    if (!individual || individual.deletedAt) {
      throw new NotFoundException('Individual not found.');
    }

    // 2. No duplicate link
    const existing = await this.linkRepository.findLink(
      companyId,
      dto.individualId,
    );
    if (existing) {
      throw new ConflictException(
        'This person is already linked to this company.',
      );
    }

    // 3. Roles must be non-empty
    if (dto.roles.length === 0) {
      throw new BadRequestException('At least one role is required.');
    }

    // 4. Create the link
    const link = await this.linkRepository.create({
      companyId,
      individualId: dto.individualId,
      roles: dto.roles,
      isKeyPerson: dto.isKeyPerson ?? false,
      ownershipPercentage: dto.ownershipPercentage,
      source: dto.source,
      appointedAt: dto.appointedAt ? new Date(dto.appointedAt) : undefined,
    });

    // 5. Audit on BOTH entities — the event matters to both sides
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.PERSON_LINKED_TO_COMPANY,
      targetType: 'Company',
      targetId: companyId,
      metadata: {
        individualId: dto.individualId,
        individualName: `${individual.firstName} ${individual.lastName}`,
        roles: dto.roles,
      },
    });

    this.logger.log(
      `Linked ${individual.firstName} ${individual.lastName} → company ${companyId} by ${actor.email}`,
    );
    return link;
  }

  async getCompanyPeople(companyId: string) {
    // Confirm the company exists + is live
    const company = await this.companyRepository.findById(companyId);
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    const links = await this.linkRepository.findPeopleByCompany(companyId);

    // Shape for the frontend: merge person identity + link attributes,
    // matching the Figma's People table columns
    const people = links.map((link) => ({
      linkId: link.id,
      individualId: link.individual.id,
      firstName: link.individual.firstName,
      middleName: link.individual.middleName,
      lastName: link.individual.lastName,
      photoUrl: link.individual.photoUrl,
      nationality: link.individual.nationality,
      riskScore: link.individual.riskScore, // person-level
      verificationStatus: link.individual.verificationStatus,
      redlistStatus: link.individual.redlistStatus,
      // ── link-level (per this company) ──
      roles: link.roles,
      isKeyPerson: link.isKeyPerson,
      ownershipPercentage: link.ownershipPercentage,
      source: link.source,
      appointedAt: link.appointedAt,
      updatedAt: link.updatedAt,
    }));

    return { data: people, count: people.length };
  }

  async updateLink(
    companyId: string,
    individualId: string,
    dto: UpdateLinkDto,
    actor: AuthenticatedUser,
  ): Promise<CompanyIndividual> {
    const before = await this.linkRepository.findLink(companyId, individualId);
    if (!before) {
      throw new NotFoundException('This person is not linked to this company.');
    }

    if (dto.roles && dto.roles.length === 0) {
      throw new BadRequestException('At least one role is required.');
    }

    const data: Prisma.CompanyIndividualUpdateInput = { ...dto };
    if (dto.appointedAt) data.appointedAt = new Date(dto.appointedAt);

    const after = await this.linkRepository.updateLink(
      companyId,
      individualId,
      data,
    );

    // Diff the link attributes that changed
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of Object.keys(dto) as (keyof typeof dto)[]) {
      if (before[field]?.toString() !== after[field]?.toString()) {
        changes[field] = { from: before[field], to: after[field] };
      }
    }

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_LINK_UPDATED,
      targetType: 'Company',
      targetId: companyId,
      metadata: { individualId, changes },
    });

    this.logger.log(
      `Link updated → company ${companyId} / person ${individualId} by ${actor.email}`,
    );
    return after;
  }

  async removeLink(
    companyId: string,
    individualId: string,
    actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const link = await this.linkRepository.findLink(companyId, individualId);
    if (!link) {
      throw new NotFoundException('This person is not linked to this company.');
    }

    // Snapshot the link in the audit BEFORE deleting — the row won't exist after
    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.PERSON_UNLINKED_FROM_COMPANY,
      targetType: 'Company',
      targetId: companyId,
      metadata: {
        individualId,
        roles: link.roles,
        ownershipPercentage: link.ownershipPercentage,
        source: link.source,
        appointedAt: link.appointedAt,
      },
    });

    await this.linkRepository.deleteLink(companyId, individualId);

    this.logger.log(
      `Unlinked person ${individualId} from company ${companyId} by ${actor.email}`,
    );
    return { message: 'Person unlinked from company.' };
  }
}
