import { Module } from '@nestjs/common';
import { RedlistService } from './redlist.service';
import { RedlistRepository } from './redlist.repository';
import { RedlistController } from './redlist.controller';
import { IndividualsModule } from '../individuals/individual.module';
import { CompaniesModule } from '../companies/companies.module';
import { RedlistDerivationService } from './redlist-derivation.service';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [CompaniesModule, IndividualsModule, StorageModule],
  controllers: [RedlistController],
  providers: [RedlistService, RedlistRepository, RedlistDerivationService],
})
export class RedlistModule {}
