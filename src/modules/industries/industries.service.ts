import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import industriesData from './data/industries.json';

@Injectable()
export class IndustriesService {
  private readonly logger = new Logger(IndustriesService.name);
  private readonly industries: string[];
  private readonly lookup: Set<string>; // lowercased, for O(1) case-insensitive validation

  constructor() {
    this.industries = industriesData;
    this.lookup = new Set(this.industries.map((name) => name.toLowerCase()));
    this.logger.log(`Loaded ${this.industries.length} industries`);
  }

  // Returns the full list of industry names (for the dropdown)
  list(): string[] {
    return this.industries;
  }

  // Case-insensitive existence check — used to validate company.industry on create/update
  isValid(name: string): boolean {
    return this.lookup.has(name.trim().toLowerCase());
  }

  // Returns the canonical (correctly-cased) name, or throws — use when you want the exact stored form
  resolve(name: string): string {
    const match = this.industries.find(
      (i) => i.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) throw new NotFoundException(`Unknown industry: ${name}`);
    return match;
  }
}
