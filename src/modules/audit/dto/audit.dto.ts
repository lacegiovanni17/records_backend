import { EvidenceConfidence, EvidenceSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AuditSort {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
}

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  readonly actorEmail?: string; // partial match

  @IsOptional()
  @IsString()
  readonly action?: string; // e.g. "company.created"

  @IsOptional()
  @IsString()
  readonly targetType?: string; // "Company" | "Individual" | ...

  @IsOptional()
  @IsString()
  readonly targetId?: string; // all events for one specific record

  @IsOptional()
  @IsEnum(AuditSort)
  readonly sort?: AuditSort;

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

export class QueryEvidenceDto {
  @IsOptional()
  @IsEnum(EvidenceSourceType)
  readonly sourceClassification?: EvidenceSourceType;

  @IsOptional()
  @IsEnum(EvidenceConfidence)
  readonly confidence?: EvidenceConfidence;
}
