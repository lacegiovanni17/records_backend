import { Injectable } from '@nestjs/common';
import { OtpCode } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Store a newly issued OTP for an email
  async create(data: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<OtpCode> {
    return this.prisma.otpCode.create({ data });
  }

  // Mark a single OTP as used so it can't be replayed
  async markUsed(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // Burn any still-pending OTPs for an email before issuing a new one
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

  // Count a wrong guess against an OTP's attempt limit
  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}
