import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  async findByTarget(params: {
    targetType: string;
    targetId: string;
    skip: number;
    take: number;
  }): Promise<[AuditLog[], number]> {
    const { targetType, targetId, skip, take } = params;
    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where: { targetType, targetId } }),
    ]);
  }

  async findMany(params: {
    where: Prisma.AuditLogWhereInput;
    orderBy: Prisma.AuditLogOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<[AuditLog[], number]> {
    const { where, orderBy, skip, take } = params;
    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy, skip, take }),
      this.prisma.auditLog.count({ where }),
    ]);
  }
}
