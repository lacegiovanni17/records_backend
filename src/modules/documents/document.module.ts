import { Module } from '@nestjs/common';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './document.service';
import { DocumentRepository } from './document.repository';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CompaniesModule } from '../companies/companies.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, CompaniesModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRepository],
})
export class DocumentsModule {}
