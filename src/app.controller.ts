import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Root route — basic liveness greeting
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
