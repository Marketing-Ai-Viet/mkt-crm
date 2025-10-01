import { Injectable, Logger } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Injectable()
export class MktLicenseEventService {
  private readonly logger = new Logger(MktLicenseEventService.name);
  constructor(private readonly mktRepo: MktRepositoryService) {}

  async getVariantFromLicenseId(licenseId: string, workspaceId?: string) {
    if (!workspaceId) return null;

    const licenseRepository =
      await this.mktRepo.getLicenseRepositoryByWorkspaceId(workspaceId);

    const license = await licenseRepository.findOne({
      where: { id: licenseId },
      relations: ['mktVariant'],
    });

    if (!license) {
      this.logger.warn(`License ${licenseId} not found when fetching variant`);
      return null;
    }

    return license.mktVariant;
  }
}
