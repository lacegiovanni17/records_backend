import { Injectable } from '@nestjs/common';
import { OtpCode } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<OtpCode> {
    return this.prisma.otpCode.create({ data });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllPending(email: string): Promise<void> {
    await this.prisma.otpCode.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  /** Find the latest active OTP for an email, regardless of code match */
  async findActiveByEmail(email: string): Promise<OtpCode | null> {
    return this.prisma.otpCode.findFirst({
      where: { email, expiresAt: { gt: new Date() }, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}
