import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DocumentType,
  DocumentName,
  RejectionReasonCode,
} from '@prisma/client';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  readonly documentType!: DocumentType;

  @IsEnum(DocumentName)
  readonly documentName!: DocumentName;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly source?: string;

  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}

export class RejectDocumentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  readonly reason!: string; // KYC: a rejection must be documented

  @IsOptional()
  @IsEnum(RejectionReasonCode)
  readonly reasonCode?: RejectionReasonCode;
}

export class RequestDocumentDto {
  @IsEnum(DocumentType)
  readonly documentType!: DocumentType;

  @IsEnum(DocumentName)
  readonly documentName!: DocumentName;

  @IsString()
  readonly assignedToAdminId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly message?: string;
}
