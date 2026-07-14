import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditController } from './audit.controller';

@Global()
@Module({
  providers: [AuditService, AuditRepository],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
