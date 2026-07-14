import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppResponse } from '../../shared/utils/app.response';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminRole } from '../../shared/interfaces/role.interface';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @Throttle({ default: { ttl: 60_000, limit: 3 } }) // max 3 OTP requests/min/IP
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    const data = await this.authService.requestOtp(dto);
    return AppResponse.success(data.message, HttpStatus.OK);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const data = await this.authService.verifyOtp(dto);
    return AppResponse.success('OTP verified', HttpStatus.OK, data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return AppResponse.success('Authenticated', HttpStatus.OK, user);
  }

  @Get('overseer-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER)
  @HttpCode(HttpStatus.OK)
  overseerOnly(@CurrentUser() user: AuthenticatedUser) {
    return AppResponse.success('You have OVERSEER access', HttpStatus.OK, user);
  }
}
