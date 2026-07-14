import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../infrastructure/email/email.service';
import { otpTemplate } from '../../infrastructure/email/templates/otp.template';
import { AdminRepository } from './repositories/admin.repository';
import { OtpRepository } from './repositories/otp.repository';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { randomInt } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const GENERIC_OTP_MESSAGE =
  'If this email is registered, a code has been sent.';

@Injectable()
export class AuthService {
  private static readonly MAX_OTP_ATTEMPTS = 5;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly otpRepository: OtpRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const admin = await this.adminRepository.findByEmail(dto.email);
    if (!admin || !admin.isActive) {
      return { message: GENERIC_OTP_MESSAGE };
    }

    await this.otpRepository.invalidateAllPending(dto.email);

    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await this.otpRepository.create({ email: dto.email, code, expiresAt });

    try {
      await this.emailService.dispatch({
        to: dto.email,
        from: `Records App <${this.configService.getOrThrow('EMAIL_USER')}>`,
        subject: 'Your Verification Code',
        html: otpTemplate(code, dto.email),
      });
    } catch (err) {
      this.logger.error(
        `requestOtp → email dispatch failed for ${dto.email}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        'Could not send verification email. Please try again.',
      );
    }

    this.logger.log(`OTP issued → ${dto.email}`);
    return { message: GENERIC_OTP_MESSAGE };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    admin: {
      id: string;
      email: string;
      userType: string;
      role: string | null;
    };
  }> {
    // Fetch the latest active OTP for this email (not matched on code yet,
    // so wrong guesses still find the record and get counted)
    const activeOtp = await this.otpRepository.findActiveByEmail(dto.email);

    if (!activeOtp) {
      await this.auditService.log({
        actorEmail: dto.email,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'no_active_code' },
      });
      throw new UnauthorizedException('Invalid or expired code.');
    }

    // Too many wrong guesses (burn the code, force a fresh request)
    if (activeOtp.attempts >= AuthService.MAX_OTP_ATTEMPTS) {
      await this.otpRepository.markUsed(activeOtp.id);
      await this.auditService.log({
        actorEmail: dto.email,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'max_attempts_exceeded' },
      });
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    // Wrong otpcode (increment attempts and reject)
    if (activeOtp.code !== dto.code) {
      await this.otpRepository.incrementAttempts(activeOtp.id);
      await this.auditService.log({
        actorEmail: dto.email,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'invalid_code', attempt: activeOtp.attempts + 1 },
      });
      throw new UnauthorizedException('Invalid or expired code.');
    }

    // When the otp code is correct
    const admin = await this.adminRepository.findByEmail(dto.email);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account is inactive.');
    }

    await this.otpRepository.markUsed(activeOtp.id);

    await this.auditService.log({
      actorId: admin.id,
      actorEmail: admin.email,
      action: AuditAction.LOGIN_SUCCESS,
      targetType: 'Admin',
      targetId: admin.id,
    });

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      userType: admin.userType,
      role: admin.role,
    });

    this.logger.log(`OTP verified - ${dto.email}`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        userType: admin.userType,
        role: admin.role,
      },
    };
  }
}
