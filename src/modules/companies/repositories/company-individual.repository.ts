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

  async create(
    data: Prisma.CompanyIndividualUncheckedCreateInput,
  ): Promise<CompanyIndividual> {
    return this.prisma.companyIndividual.create({ data });
  }

  async findLink(
    companyId: string,
    individualId: string,
  ): Promise<CompanyIndividual | null> {
    return this.prisma.companyIndividual.findUnique({
      where: { companyId_individualId: { companyId, individualId } },
    });
  }

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

  async deleteLink(companyId: string, individualId: string): Promise<void> {
    await this.prisma.companyIndividual.delete({
      where: { companyId_individualId: { companyId, individualId } },
    });
  }
}
