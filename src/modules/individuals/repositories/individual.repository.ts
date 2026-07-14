import { Injectable } from '@nestjs/common';
import { Individual, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

type IndividualLinkWithCompany = Prisma.CompanyIndividualGetPayload<{
  include: { company: true };
}>;

@Injectable()
export class IndividualRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.IndividualCreateInput): Promise<Individual> {
    return this.prisma.individual.create({ data });
  }

  async findById(id: string): Promise<Individual | null> {
    return this.prisma.individual.findUnique({ where: { id } });
  }

  async findManyWithCount(params: {
    where: Prisma.IndividualWhereInput;
    orderBy: Prisma.IndividualOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<[Individual[], number]> {
    const { where, orderBy, skip, take } = params;
    return this.prisma.$transaction([
      this.prisma.individual.findMany({ where, orderBy, skip, take }),
      this.prisma.individual.count({ where }),
    ]);
  }

  async update(
    id: string,
    data: Prisma.IndividualUpdateInput,
  ): Promise<Individual> {
    return this.prisma.individual.update({ where: { id }, data });
  }

  async findCompaniesByIndividual(
    individualId: string,
  ): Promise<IndividualLinkWithCompany[]> {
    return this.prisma.companyIndividual.findMany({
      where: {
        individualId,
        company: { deletedAt: null }, // exclude links to deleted companies
      },
      include: {
        company: true, // the JOIN — each link's full company record, one query
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
