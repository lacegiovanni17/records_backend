import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsInt,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VerificationStatus,
  RedlistStatus,
} from '../../../shared/interfaces/company.interface';
import { RiskLevel } from '../../../shared/enums/risk-level.enum';
import { IndividualSort } from '../enums/individual-query.enum';
import { PartialType } from '@nestjs/mapped-types';

export class CreateIndividualDto {
  @IsString()
  @MaxLength(100)
  readonly firstName!: string;

  @IsString()
  @MaxLength(100)
  readonly lastName!: string;

  @IsString()
  @MaxLength(100)
  readonly nationality!: string;

  @IsDateString()
  readonly dateOfBirth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly middleName?: string;

  // @IsOptional()
  // @IsString()
  // @MaxLength(500)
  // readonly photoUrl?: string;

  @IsOptional()
  @IsString()
  readonly about?: string;
}

export class QueryIndividualsDto {
  @IsOptional()
  @IsString()
  readonly search?: string; // matches first/middle/last name

  @IsOptional()
  @IsEnum(RiskLevel)
  readonly riskLevel?: RiskLevel;

  @IsOptional()
  @IsEnum(VerificationStatus)
  readonly verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsEnum(RedlistStatus)
  readonly redlistStatus?: RedlistStatus;

  // role?: deferred — lives on CompanyIndividual, added after linking layer

  @IsOptional()
  @IsEnum(IndividualSort)
  readonly sort?: IndividualSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;
}

export class UpdateIndividualDto extends PartialType(CreateIndividualDto) {}
// No OmitType needed — individuals have no immutable "registrationNumber" equivalent

export class FlagIndividualDto {
  @IsString() @MinLength(3) @MaxLength(500) readonly reason!: string;
}
