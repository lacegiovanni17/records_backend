import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { Prisma } from '@prisma/client';
import { AuditSort, QueryAuditDto } from './dto/audit.dto';

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  /**
   * Records an audit entry. Deliberately swallows its own errors —
   * a failed audit write must NEVER break the business action that triggered it.
   * But we log the failure loudly so it's never silent.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.auditRepository.create({
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata
          ? (entry.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Audit write failed for action "${entry.action}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async getEntityActivity(
    targetType: string,
    targetId: string,
    page = 1,
    limit = 25,
  ) {
    const skip = (page - 1) * limit;
    const [data, count] = await this.auditRepository.findByTarget({
      targetType,
      targetId,
      skip,
      take: limit,
    });
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async list(query: QueryAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorEmail)
      where.actorEmail = { contains: query.actorEmail, mode: 'insensitive' };
    if (query.action) where.action = query.action;
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;

    const [data, count] = await this.auditRepository.findMany({
      where,
      orderBy: { createdAt: query.sort === AuditSort.OLDEST ? 'asc' : 'desc' },
      skip,
      take: limit,
    });

    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}
