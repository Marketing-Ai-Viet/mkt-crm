import { Injectable, NotFoundException } from '@nestjs/common';

import {
  UserLicenseDto,
  UserLicensesResponseDto,
} from 'src/mkt-core/customer/dto/get-user-licenses.dto';
import { ACCOUNT_PROVIDER } from 'src/mkt-core/customer/constants';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';

@Injectable()
export class MktCustomerLicenseService {
  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly licenseProxyService: MktLicenseProxyService,
  ) {}

  async getLicensesForUser(
    mktAccountId: string,
    _workspaceId: string,
  ): Promise<UserLicensesResponseDto> {
    // Find customer by linked MKT Server account in linkedAccounts JSONB array
    const customer = await this.customerRepository.findByLinkedAccount(
      ACCOUNT_PROVIDER.MKT_SERVER,
      mktAccountId,
    );

    if (!customer) {
      throw new NotFoundException(
        `Customer not found for MKT Account ID: ${mktAccountId}`,
      );
    }

    // Get licenses from external MKT Server using integration module
    const licenseResponse = await this.licenseProxyService.findAll({
      userId: mktAccountId,
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

      // Try to find customer by linked MKT Server account from license
      const customer = await this.customerRepository.findByLinkedAccount(
        ACCOUNT_PROVIDER.MKT_SERVER,
        license.userId,
      );

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
