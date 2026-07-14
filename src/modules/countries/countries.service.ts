import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { QueryCountriesDto } from './dto/query-countries.dto';

interface RawCountry {
  capital?: string;
  code: string;
  continent?: string;
  flag_1x1: string;
  flag_4x3: string;
  iso: boolean;
  name: string;
}

export interface Country {
  code: string; // ISO alpha-2, uppercase: "NG"
  name: string; // "Nigeria"
  flag: string; // CDN URL
  continent: string | null;
  capital: string | null;
}

@Injectable()
export class CountriesService {
  private readonly countries: Country[];
  private readonly byCode: Map<string, Country>;

  constructor() {
    const filePath = path.join(__dirname, 'data', 'countries.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawCountry[];

    this.countries = raw
      .filter((c) => c.iso === true) // drop EU, Scotland, "Unknown", etc.
      .map((c) => ({
        code: c.code.toUpperCase(),
        name: c.name,
        flag: `https://flagcdn.com/${c.code}.svg`,
        continent: c.continent ?? null,
        capital: c.capital ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.byCode = new Map(this.countries.map((c) => [c.code, c]));
  }

  /** Filterable list — search by name, exact code, or continent */
  getAll(query?: QueryCountriesDto): Country[] {
    let result = this.countries;

    if (query?.continent) {
      const continent = query.continent.toLowerCase();
      result = result.filter((c) => c.continent?.toLowerCase() === continent);
    }

    if (query?.code) {
      const code = query.code.toUpperCase();
      result = result.filter((c) => c.code === code);
    }

    if (query?.search) {
      const search = query.search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(search));
    }

    if (query?.capital) {
      const capital = query.capital.toLowerCase();
      result = result.filter((c) => c.capital?.toLowerCase().includes(capital));
    }

    return result;
  }

  /** Distinct continents — powers the frontend filter dropdown */
  getContinents(): string[] {
    return [
      ...new Set(
        this.countries
          .map((c) => c.continent)
          .filter((c): c is string => c !== null),
      ),
    ].sort();
  }

  /** O(1) lookup — used by the Company create flow to validate country */
  findByCode(code: string): Country {
    const country = this.byCode.get(code.toUpperCase());
    if (!country) {
      throw new NotFoundException(`Unknown country code: ${code}`);
    }
    return country;
  }
}
