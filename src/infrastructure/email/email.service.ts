/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailDispatcherDto } from './dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_SERVER'),
      port: parseInt(this.configService.get<string>('SMTP_PORT') ?? '465'),
      secure: true,
      auth: {
        user: this.configService.getOrThrow<string>('EMAIL_USER'),
        pass: this.configService.getOrThrow<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async dispatch(dto: MailDispatcherDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        to: dto.to,
        from: dto.from,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });
      this.logger.log(`Email dispatched → ${dto.to}`);
    } catch (error: any) {
      this.logger.error(`Email failed → ${dto.to}`, error.stack);
      throw error;
    }
  }
}
