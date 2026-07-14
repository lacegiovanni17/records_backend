import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CompanyRepository } from './repositories/company.repository';
import { CompanyIndividualRepository } from './repositories/company-individual.repository';
import { CompanyRelationshipRepository } from './repositories/company-relationship.repository';
import { AuditService } from '../audit/audit.service';
import { CompanyRelationship } from '@prisma/client';
import { AddCompanyRelationshipDto } from './dto/company.dto';
import { AuditAction } from '../audit/audit-action.enum';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';

const HIGH_RISK_THRESHOLD = 71; // riskScore >= 71 is "high risk" (matches your RiskLevel banding)

@Injectable()
export class CompanyStructureService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly linkRepository: CompanyIndividualRepository,
    private readonly relationshipRepository: CompanyRelationshipRepository,
    private readonly auditService: AuditService,
  ) {}

  // Assembles the flat structure graph (nodes + typed edges + summary + risk) for a company
  async getCompanyStructure(companyId: string) {
    const root = await this.companyRepository.findById(companyId);
    if (!root || root.deletedAt) {
      throw new NotFoundException('Company not found.');
    }

    const people = await this.linkRepository.findPeopleByCompany(companyId); // CompanyIndividual + individual
    const children =
      await this.relationshipRepository.findChildrenOf(companyId); // CompanyRelationship + childCompany

    // ── Nodes: the root, each linked person, each related company ──
    const nodes = [
      {
        id: root.id,
        kind: 'COMPANY' as const,
        name: root.name,
        riskScore: root.riskScore,
        verificationStatus: root.verificationStatus,
        redlistStatus: root.redlistStatus,
        logoUrl: root.logoUrl,
        isRoot: true,
      },
      ...people.map((link) => ({
        id: link.individual.id,
        kind: 'INDIVIDUAL' as const,
        name: `${link.individual.firstName} ${link.individual.lastName}`,
        riskScore: link.individual.riskScore,
        verificationStatus: link.individual.verificationStatus,
        redlistStatus: link.individual.redlistStatus,
        photoUrl: link.individual.photoUrl,
        isRoot: false,
      })),
      ...children.map((rel) => ({
        id: rel.childCompany.id,
        kind: 'COMPANY' as const,
        name: rel.childCompany.name,
        riskScore: rel.childCompany.riskScore,
        verificationStatus: rel.childCompany.verificationStatus,
        redlistStatus: rel.childCompany.redlistStatus,
        logoUrl: rel.childCompany.logoUrl,
        isRoot: false,
      })),
    ];

    // ── Edges: one person may yield TWO edges (directorship + ownership) ──
    const edges: {
      from: string;
      to: string;
      type: string;
      ownershipPercentage: string | null;
    }[] = [];

    for (const link of people) {
      // Directorship edge if they hold a director-type role
      if (link.roles.includes('DIRECTOR')) {
        edges.push({
          from: root.id,
          to: link.individual.id,
          type: 'DIRECTORSHIP',
          ownershipPercentage: null,
        });
      }
      // Ownership edge if they hold a stake
      if (link.ownershipPercentage !== null) {
        edges.push({
          from: root.id,
          to: link.individual.id,
          type: 'OWNERSHIP',
          ownershipPercentage: link.ownershipPercentage.toString(),
        });
      }
    }

    for (const rel of children) {
      // SUBSIDIARY or INVESTMENT — the CompanyRelationType maps straight to edge type
      edges.push({
        from: root.id,
        to: rel.childCompany.id,
        type: rel.type,
        ownershipPercentage: rel.ownershipPercentage?.toString() ?? null,
      });
    }

    // ── Structure Summary ──
    const directors = people.filter((l) => l.roles.includes('DIRECTOR')).length;
    const shareholders = people.filter(
      (l) => l.ownershipPercentage !== null,
    ).length;
    const subsidiaries = children.filter((r) => r.type === 'SUBSIDIARY').length;

    const summary = {
      directors,
      shareholders,
      subsidiaries,
      // "parent company" count = how many companies list THIS one as their child.
      // Derived elsewhere would need a reverse query; the panel shows the root's own
      // parent context, so we expose subsidiaries here and leave parent lookup to a
      // dedicated call if needed. For now: 0 unless you want the reverse query added.
      parentCompanies: 0,
    };

    // ── Risk in Structure ──
    const allEntities = nodes.filter((n) => !n.isRoot);
    const riskInStructure = {
      highRiskEntities: allEntities.filter(
        (n) => n.riskScore >= HIGH_RISK_THRESHOLD,
      ).length,
      flaggedDirectors: people.filter(
        (l) =>
          l.roles.includes('DIRECTOR') &&
          l.individual.redlistStatus === 'FLAGGED',
      ).length,
      // interconnectedRedFlags — deferred (graph traversal, risk-engine territory)
      interconnectedRedFlags: 0,
    };

    return {
      root: nodes[0],
      nodes,
      edges,
      summary,
      riskInStructure,
    };
  }

  // Creates a company↔company relationship (subsidiary or investment) from this company
  async addCompanyRelationship(
    parentCompanyId: string,
    dto: AddCompanyRelationshipDto,
    actor: AuthenticatedUser,
  ): Promise<CompanyRelationship> {
    // Both companies must exist + be live
    const parent = await this.companyRepository.findById(parentCompanyId);
    if (!parent || parent.deletedAt)
      throw new NotFoundException('Parent company not found.');

    const child = await this.companyRepository.findById(dto.childCompanyId);
    if (!child || child.deletedAt)
      throw new NotFoundException('Child company not found.');

    // No self-relationship (DB constraint also enforces this)
    if (parentCompanyId === dto.childCompanyId) {
      throw new BadRequestException(
        'A company cannot have a relationship with itself.',
      );
    }

    // No duplicate edge of the same type
    const existing = await this.relationshipRepository.findEdge(
      parentCompanyId,
      dto.childCompanyId,
      dto.type,
    );
    if (existing)
      throw new ConflictException('This relationship already exists.');

    const relationship = await this.relationshipRepository.create({
      parentCompanyId,
      childCompanyId: dto.childCompanyId,
      type: dto.type,
      ownershipPercentage: dto.ownershipPercentage,
      source: dto.source,
      addedByAdminId: actor.id,
    });

    await this.auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.COMPANY_RELATIONSHIP_ADDED,
      targetType: 'Company',
      targetId: parentCompanyId,
      metadata: { childCompanyId: dto.childCompanyId, type: dto.type },
    });

    return relationship;
  }
}
