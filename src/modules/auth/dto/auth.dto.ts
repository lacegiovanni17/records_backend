import { IsEmail, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  readonly email!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits.' })
  readonly code!: string;
}
