import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IndustriesService } from './industries.service';
import { AppResponse } from '../../shared/utils/app.response';

@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  // GET /industries — full industry list for the create-company dropdown
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  list() {
    const data = this.industriesService.list();
    return AppResponse.success('Industries retrieved', HttpStatus.OK, data);
  }
}
