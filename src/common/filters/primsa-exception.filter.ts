/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorMap: Record<string, { status: number; message: string }> = {
      P2002: {
        status: HttpStatus.CONFLICT,
        message: 'Record already exists (unique constraint)',
      },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint failed',
      },
    };

    const mapped = errorMap[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    };

    this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);

    response.status(mapped.status).json({
      success: false,
      statusCode: mapped.status,
      message: mapped.message,
    });
  }
}
