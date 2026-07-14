import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedlistRepository } from './redlist.repository';

@Injectable()
export class RedlistDerivationService {
  constructor(private readonly redlistRepository: RedlistRepository) {}

  async syncCompany(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const active = await this.redlistRepository.countActiveCasesForCompany(
      companyId,
      tx,
    );
    await tx.company.update({
      where: { id: companyId },
      data: { redlistStatus: active > 0 ? 'FLAGGED' : 'CLEAN' },
    });
  }

  async syncIndividual(
    individualId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const active = await this.redlistRepository.countActiveCasesForIndividual(
      individualId,
      tx,
    );
    await tx.individual.update({
      where: { id: individualId },
      data: { redlistStatus: active > 0 ? 'FLAGGED' : 'CLEAN' },
    });
  }

  /** Recompute EVERY entity on a case (status-change / soft-delete). */
  async syncAllEntitiesOnCase(
    caseId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const refs = await this.redlistRepository.findEntityRefsByCase(caseId, tx);
    for (const ref of refs) {
      if (ref.companyId) await this.syncCompany(ref.companyId, tx);
      if (ref.individualId) await this.syncIndividual(ref.individualId, tx);
    }
  }
}
