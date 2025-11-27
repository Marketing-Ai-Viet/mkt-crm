import { Injectable, NotFoundException } from '@nestjs/common';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import {
  UserLicenseDto,
  UserLicensesResponseDto,
} from 'src/mkt-core/customer/dto/get-user-licenses.dto';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Injectable()
export class MktCustomerLicenseService {
  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    private readonly mktRepo: MktRepositoryService,
  ) {}

  async getLicensesForUser(
    userId: string,
    _workspaceId: string,
  ): Promise<UserLicensesResponseDto> {
    const customerRepository = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    const licenseRepository = await this.mktRepo.getRepository(
      MktLicenseWorkspaceEntity,
    );

    // Find customer by userId
    const customer = await customerRepository.findOne({
      where: {
        userId: userId,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found for user ID: ${userId}`);
    }

    // Get all licenses for this customer
    const licenses = await licenseRepository.find({
      where: {
        mktCustomerId: customer.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    // Map to DTO
    const licenseDtos: UserLicenseDto[] = licenses.map((license) => ({
      id: license.id,
      name: license.name,
      licenseKey: license.licenseKey,
      status: license.status ?? undefined,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      lastLoginAt: license.lastLoginAt,
      trialLicense: license.trialLicense,
      deviceInfo: license.deviceInfo,
      notes: license.notes,
      createdAt: new Date(license.createdAt),
      updatedAt: new Date(license.updatedAt),
      customerId: customer.id,
      customerName: customer.name,
    }));

    return {
      licenses: licenseDtos,
      total: licenseDtos.length,
      customerId: customer.id,
      customerName: customer.name,
    };
  }

  async getLicenseByKey(
    licenseKey: string,
    _workspaceId: string,
  ): Promise<UserLicenseDto | null> {
    const licenseRepository = await this.mktRepo.getRepository(
      MktLicenseWorkspaceEntity,
    );

    const license = await licenseRepository.findOne({
      where: {
        licenseKey: licenseKey,
      },
    });

    if (!license) {
      return null;
    }

    const customerRepository = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    const customer = license.mktCustomerId
      ? await customerRepository.findOne({
          where: {
            id: license.mktCustomerId,
          },
        })
      : null;

    return {
      id: license.id,
      name: license.name,
      licenseKey: license.licenseKey,
      status: license.status ?? undefined,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      lastLoginAt: license.lastLoginAt,
      trialLicense: license.trialLicense,
      deviceInfo: license.deviceInfo,
      notes: license.notes,
      createdAt: new Date(license.createdAt),
      updatedAt: new Date(license.updatedAt),
      customerId: customer?.id,
      customerName: customer?.name,
    };
  }
}
