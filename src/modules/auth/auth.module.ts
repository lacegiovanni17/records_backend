import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../../infrastructure/email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminRepository } from './repositories/admin.repository';
import { OtpRepository } from './repositories/otp.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminRepository, OtpRepository, JwtStrategy],
  exports: [AdminRepository],
})
export class AuthModule {}
