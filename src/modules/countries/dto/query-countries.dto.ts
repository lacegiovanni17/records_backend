import { IsOptional, IsString } from 'class-validator';

export class QueryCountriesDto {
  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @IsString()
  readonly code?: string; // ISO alpha-2

  @IsOptional()
  @IsString()
  readonly continent?: string;

  @IsOptional()
  @IsString()
  readonly capital?: string;
}
