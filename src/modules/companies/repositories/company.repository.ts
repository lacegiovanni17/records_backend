import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  async findByRegistrationNumber(reg: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { registrationNumber: reg },
    });
  }

  async findManyWithCount(params: {
    where: Prisma.CompanyWhereInput;
    orderBy: Prisma.CompanyOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<[Company[], number]> {
    const { where, orderBy, skip, take } = params;
    // $transaction runs both against one consistent snapshot —
    // count can't drift from the page if a write lands mid-query
    return this.prisma.$transaction([
      this.prisma.company.findMany({ where, orderBy, skip, take }),
      this.prisma.company.count({ where }),
    ]);
  }

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({ where: { id }, data });
  }
}
