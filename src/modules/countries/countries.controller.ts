import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { QueryCountriesDto } from './dto/query-countries.dto';
import { AppResponse } from '../../shared/utils/app.response';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  // List all countries, optionally filtered/searched (name, iso, capital, region)
  @Get()
  @HttpCode(HttpStatus.OK)
  getCountries(@Query() query: QueryCountriesDto) {
    const data = this.countriesService.getAll(query);
    return AppResponse.success('Countries retrieved', HttpStatus.OK, data);
  }

  // List the distinct continents/regions
  // MUST come before @Get(':code') — otherwise "continents" matches :code
  @Get('continents')
  @HttpCode(HttpStatus.OK)
  getContinents() {
    const data = this.countriesService.getContinents();
    return AppResponse.success('Continents retrieved', HttpStatus.OK, data);
  }

  // Fetch a single country by its ISO code
  @Get(':code')
  @HttpCode(HttpStatus.OK)
  getByCode(@Param('code') code: string) {
    const data = this.countriesService.findByCode(code);
    return AppResponse.success('Country retrieved', HttpStatus.OK, data);
  }
}
