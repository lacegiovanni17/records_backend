// src/modules/companies/dto/company.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import {
  Industry,
  VerificationStatus,
  RedlistStatus,
} from '../../../shared/interfaces/company.interface';
import { CompanySort } from '../enums/company-query.enum';
import { RiskLevel } from '../../../shared/enums/risk-level.enum';
import { PersonRole } from '../enums/company-individual.enum';
import { CompanyRelationType } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => {
    const input: unknown = value;
    return typeof input === 'string' ? input.trim() : input;
  })
  readonly name!: string;
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly registrationNumber!: string;
  @IsString() @MaxLength(2) readonly countryCode!: string;
  @IsEnum(Industry) readonly industry!: Industry;
  @IsString() @MaxLength(100) readonly companyType!: string;
  @IsDateString() readonly incorporationDate!: string;
  @IsEmail() readonly email!: string;
  @IsOptional() @IsString() readonly registeredAddress?: string;
  @IsOptional() @IsString() readonly phone?: string;
  @IsOptional() @IsString() readonly website?: string;
  @IsOptional() @IsDateString() readonly foundedDate?: string;
  @IsOptional() @IsNumberString() readonly marketCap?: string;
  // @IsOptional() @IsString() @MaxLength(500) readonly logoUrl?: string;
  @IsOptional() @IsString() readonly about?: string;
  @IsOptional() @IsString() readonly regulatoryAuthority?: string;
}

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['registrationNumber'] as const),
) {}

export class FlagCompanyDto {
  @IsString() @MinLength(3) @MaxLength(500) readonly reason!: string;
}

export class QueryCompaniesDto {
  @IsOptional() @IsString() readonly search?: string;
  @IsOptional() @IsEnum(RiskLevel) readonly riskLevel?: RiskLevel;
  @IsOptional()
  @IsEnum(VerificationStatus)
  readonly verificationStatus?: VerificationStatus;
  @IsOptional() @IsEnum(RedlistStatus) readonly redlistStatus?: RedlistStatus;
  @IsOptional() @IsEnum(Industry) readonly industry?: Industry;
  @IsOptional() @IsString() readonly country?: string;
  @IsOptional() @IsEnum(CompanySort) readonly sort?: CompanySort;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) readonly page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;
}

export class LinkPersonDto {
  @IsUUID()
  readonly individualId!: string; // the person to attach

  @IsArray()
  @IsEnum(PersonRole, { each: true }) // validates every item in the array
  readonly roles!: PersonRole[];

  @IsOptional()
  @IsBoolean()
  readonly isKeyPerson?: boolean;

  @IsOptional()
  @IsNumberString()
  readonly ownershipPercentage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly source?: string;

  @IsOptional()
  @IsDateString()
  readonly appointedAt?: string;
}

export class UpdateLinkDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PersonRole, { each: true })
  readonly roles?: PersonRole[];

  @IsOptional()
  @IsBoolean()
  readonly isKeyPerson?: boolean;

  @IsOptional()
  @IsNumberString()
  readonly ownershipPercentage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly source?: string;

  @IsOptional()
  @IsDateString()
  readonly appointedAt?: string;
}

export class AddCompanyRelationshipDto {
  @IsUUID() readonly childCompanyId!: string; // the subsidiary / invested company
  @IsEnum(CompanyRelationType) readonly type!: CompanyRelationType; // SUBSIDIARY | INVESTMENT
  @IsOptional() @IsNumberString() readonly ownershipPercentage?: string;
  @IsOptional() @IsString() @MaxLength(300) readonly source?: string;
}
