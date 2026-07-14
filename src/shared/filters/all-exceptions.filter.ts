import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];

    if (isHttp) {
      const raw = exception.getResponse();
      message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] }).message ??
            exception.message);
    } else {
      message = 'Internal server error';
    }

    if (!isHttp || statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${statusCode}] ${JSON.stringify(message)}`);
    }

    res.status(statusCode).json({
      status: false,
      statusCode,
      message,
      data: null,
    });
  }
}
