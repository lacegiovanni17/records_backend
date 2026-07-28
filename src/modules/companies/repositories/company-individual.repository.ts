import { Injectable } from '@nestjs/common';
import { CompanyIndividual, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// Named type: a link row WITH its individual joined in
type CompanyIndividualWithPerson = Prisma.CompanyIndividualGetPayload<{
  include: { individual: true };
}>;

@Injectable()
export class CompanyIndividualRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Create a company-person link row
  async create(
    data: Prisma.CompanyIndividualUncheckedCreateInput,
  ): Promise<CompanyIndividual> {
    return this.prisma.companyIndividual.create({ data });
  }

  // Fetch the single link between a company and a person, if it exists
  async findLink(
    companyId: string,
    individualId: string,
  ): Promise<CompanyIndividual | null> {
    return this.prisma.companyIndividual.findUnique({
      where: { companyId_individualId: { companyId, individualId } },
    });
  }

  // List a company's links with each person joined in (excludes deleted people)
  async findPeopleByCompany(
    companyId: string,
  ): Promise<CompanyIndividualWithPerson[]> {
    return this.prisma.companyIndividual.findMany({
      where: {
        companyId,
        individual: { deletedAt: null },
      },
      include: {
        individual: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update a link's attributes by the (company, person) pair
  async updateLink(
    companyId: string,
    individualId: string,
    data: Prisma.CompanyIndividualUpdateInput,
  ): Promise<CompanyIndividual> {
    return this.prisma.companyIndividual.update({
      where: { companyId_individualId: { companyId, individualId } },
      data,
    });
  }

  // Hard-delete a link row (history is preserved in the audit log)
  async deleteLink(companyId: string, individualId: string): Promise<void> {
    await this.prisma.companyIndividual.delete({
      where: { companyId_individualId: { companyId, individualId } },
    });
  }
}
