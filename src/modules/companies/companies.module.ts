import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyRepository } from './repositories/company.repository';
import { CountriesModule } from '../countries/countries.module';
import { IndividualsModule } from '../individuals/individual.module';
import { CompanyPeopleService } from './company-people.service';
import { CompanyIndividualRepository } from './repositories/company-individual.repository';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CompanyStructureService } from './company-structure.service';
import { CompanyRelationshipRepository } from './repositories/company-relationship.repository';

@Module({
  imports: [CountriesModule, IndividualsModule, StorageModule],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    CompanyPeopleService,
    CompanyRepository,
    CompanyIndividualRepository,
    CompanyStructureService,
    CompanyRelationshipRepository,
  ],
  exports: [CompanyRepository],
})
export class CompaniesModule {}
