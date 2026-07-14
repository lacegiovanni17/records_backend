import { Module } from '@nestjs/common';
import { IndividualsController } from './individual.controller';
import { IndividualsService } from './individual.service';
import { IndividualRepository } from './repositories/individual.repository';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [IndividualsController],
  providers: [IndividualsService, IndividualRepository],
  exports: [IndividualRepository],
})
export class IndividualsModule {}
