import { Injectable } from '@nestjs/common';
import {
  CompanyRelationship,
  CompanyRelationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class CompanyRelationshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Creates a company↔company relationship (subsidiary / investment)
  async create(
    data: Prisma.CompanyRelationshipUncheckedCreateInput,
  ): Promise<CompanyRelationship> {
    return this.prisma.companyRelationship.create({ data });
  }

  // Returns relationships where this company is the parent, with child company joined
  async findChildrenOf(parentCompanyId: string) {
    return this.prisma.companyRelationship.findMany({
      where: { parentCompanyId },
      include: { childCompany: true },
    });
  }

  // Finds a specific edge (parent → child of a given type), for duplicate prevention
  async findEdge(
    parentCompanyId: string,
    childCompanyId: string,
    type: CompanyRelationType,
  ) {
    return this.prisma.companyRelationship.findUnique({
      where: {
        parentCompanyId_childCompanyId_type: {
          parentCompanyId,
          childCompanyId,
          type,
        },
      },
    });
  }
}
