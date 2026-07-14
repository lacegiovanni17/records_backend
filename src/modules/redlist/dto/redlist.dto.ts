import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CaseCategory, CaseSeverity, CaseStatus } from '@prisma/client';
import { CaseRole } from '@prisma/client';
import {
  EvidenceKind,
  EvidenceConfidence,
  EvidenceSourceType,
} from '@prisma/client';

export enum RedlistSort {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  SEVERITY_HIGH = 'SEVERITY_HIGH',
  LAST_UPDATED = 'LAST_UPDATED',
}

export class CreateCaseDto {
  @IsString() @MaxLength(300) readonly title!: string;
  @IsEnum(CaseCategory) readonly category!: CaseCategory;
  @IsEnum(CaseSeverity) readonly severity!: CaseSeverity;
  @IsOptional() @IsUUID() readonly companyId?: string;
  @IsOptional() @IsUUID() readonly individualId?: string;
  @IsOptional() @IsEnum(CaseRole) readonly roleInCase?: CaseRole;
  @IsOptional() @IsString() @MaxLength(100) readonly caseReference?: string;
  @IsOptional() @IsString() readonly summary?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly jurisdiction?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly legalBasis?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly authority?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly sourceName?: string;
  @IsOptional() @IsString() @MaxLength(500) readonly sourceUrl?: string;
  @IsOptional() @IsDateString() readonly incidentDate?: string;
  @IsOptional() @IsDateString() readonly filedDate?: string;
  @IsOptional() @IsUUID() readonly assignedToAdminId?: string;
}

export class UpdateCaseDto {
  @IsOptional() @IsString() @MaxLength(300) readonly title?: string;
  @IsOptional() @IsEnum(CaseCategory) readonly category?: CaseCategory;
  @IsOptional() @IsEnum(CaseSeverity) readonly severity?: CaseSeverity;
  @IsOptional() @IsString() @MaxLength(100) readonly caseReference?: string;
  @IsOptional() @IsString() readonly summary?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly jurisdiction?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly legalBasis?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly authority?: string;
  @IsOptional() @IsString() @MaxLength(200) readonly sourceName?: string;
  @IsOptional() @IsString() @MaxLength(500) readonly sourceUrl?: string;
  @IsOptional() @IsDateString() readonly incidentDate?: string;
  @IsOptional() @IsDateString() readonly filedDate?: string;
  @IsOptional() @IsUUID() readonly assignedToAdminId?: string;
}

export class ChangeCaseStatusDto {
  @IsEnum(CaseStatus) readonly status!: CaseStatus;
  @IsOptional() @IsString() @MaxLength(500) readonly note?: string;
}

export class QueryCasesDto {
  @IsOptional() @IsString() readonly search?: string; // title / caseReference
  @IsOptional() @IsEnum(CaseCategory) readonly category?: CaseCategory;
  @IsOptional() @IsEnum(CaseSeverity) readonly severity?: CaseSeverity;
  @IsOptional() @IsEnum(CaseStatus) readonly status?: CaseStatus;
  @IsOptional() @IsEnum(RedlistSort) readonly sort?: RedlistSort;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) readonly page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;
}

export class LinkEntityDto {
  @IsOptional() @IsUUID() readonly companyId?: string;
  @IsOptional() @IsUUID() readonly individualId?: string;
  @IsEnum(CaseRole) readonly roleInCase!: CaseRole;
}

export class AddEvidenceDto {
  @IsString()
  @MaxLength(300)
  readonly name!: string; // free text: "Wire Transfer Records"

  @IsEnum(EvidenceKind)
  readonly kind!: EvidenceKind; // DOCUMENT | LINK

  @IsEnum(EvidenceConfidence)
  readonly confidence!: EvidenceConfidence; // LOW | MEDIUM | HIGH

  @IsOptional()
  @IsEnum(EvidenceSourceType)
  readonly sourceClassification?: EvidenceSourceType;

  // Only for kind = LINK (validated in service against kind)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly url?: string;
}
