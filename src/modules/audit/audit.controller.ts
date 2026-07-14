import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminRole } from '../../shared/interfaces/role.interface';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/audit.dto';
import { AppResponse } from '../../shared/utils/app.response';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async list(@Query() query: QueryAuditDto) {
    const data = await this.auditService.list(query);
    return AppResponse.success('Audit logs retrieved', HttpStatus.OK, data);
  }
}
