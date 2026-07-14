import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { EmailModule } from './infrastructure/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import appConfig from './config/app.config';
import { AuditModule } from './modules/audit/audit.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CountriesModule } from './modules/countries/countries.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { IndividualsModule } from './modules/individuals/individual.module';
import { DocumentsModule } from './modules/documents/document.module';
import { RedlistModule } from './modules/redlist/redlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    HealthModule,
    EmailModule,
    AuthModule,
    AuditModule,
    CountriesModule,
    CompaniesModule,
    IndividualsModule,
    DocumentsModule,
    RedlistModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 60 seconds
        limit: 20, // 20 requests / minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // applies to every route by default
    },
  ],
})
export class AppModule {}
