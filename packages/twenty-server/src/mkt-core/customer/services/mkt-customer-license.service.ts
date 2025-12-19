import { Injectable, NotFoundException } from '@nestjs/common';

import {
  UserLicenseDto,
  UserLicensesResponseDto,
} from 'src/mkt-core/customer/dto/get-user-licenses.dto';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';

@Injectable()
export class MktCustomerLicenseService {
  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly licenseProxyService: MktLicenseProxyService,
  ) {}

  async getLicensesForUser(
    userId: string,
    _workspaceId: string,
  ): Promise<UserLicensesResponseDto> {
    const customerRepository = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
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

    // Get licenses from external MKT Server using integration module
    const licenseResponse = await this.licenseProxyService.findAll({
      userId: userId,
      page: 1,
      limit: 1000,
    });

    // Map to DTO
    const licenseDtos: UserLicenseDto[] = licenseResponse.data.map(
      (license) => ({
        id: license.id,
        name: license.product?.name ?? license.licenseKey,
        licenseKey: license.licenseKey,
        status: license.status,
        activatedAt: license.startDate
          ? new Date(license.startDate)
          : undefined,
        expiresAt: license.endDate ? new Date(license.endDate) : undefined,
        lastLoginAt: undefined,
        trialLicense: license.type === 'trial',
        deviceInfo: undefined,
        notes: undefined,
        createdAt: new Date(license.createdAt),
        updatedAt: new Date(license.updatedAt),
        customerId: customer.id,
        customerName: customer.name,
      }),
    );

    return {
      licenses: licenseDtos,
      total: licenseResponse.total,
      customerId: customer.id,
      customerName: customer.name,
    };
  }

  async getLicenseByKey(
    licenseKey: string,
    _workspaceId: string,
  ): Promise<UserLicenseDto | null> {
    try {
      // Get license from external MKT Server using integration module
      const license =
        await this.licenseProxyService.findByLicenseKey(licenseKey);

      if (!license) {
        return null;
      }

      const customerRepository = await this.mktRepo.getRepository(
        MktCustomerWorkspaceEntity,
      );

      // Try to find customer by userId from license
      const customer = await customerRepository.findOne({
        where: {
          userId: license.userId,
        },
      });

      return {
        id: license.id,
        name: license.product?.name ?? license.licenseKey,
        licenseKey: license.licenseKey,
        status: license.status,
        activatedAt: license.startDate
          ? new Date(license.startDate)
          : undefined,
        expiresAt: license.endDate ? new Date(license.endDate) : undefined,
        lastLoginAt: undefined,
        trialLicense: license.type === 'trial',
        deviceInfo: undefined,
        notes: undefined,
        createdAt: new Date(license.createdAt),
        updatedAt: new Date(license.updatedAt),
        customerId: customer?.id,
        customerName: customer?.name,
      };
    } catch (error) {
      return null;
    }
  }
}
