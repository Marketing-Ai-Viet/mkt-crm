import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { LicenseProxyService } from 'src/mkt-core/oauth2-client/license/services';
import {
  LICENSE_SUCCESS_MESSAGES,
  LICENSE_BULK_SUCCESS_MESSAGE_BUILDER,
} from 'src/mkt-core/oauth2-client/license/constants';
import {
  LicenseOutput,
  PaginatedLicenseOutput,
  LicenseValidationOutput,
  LicenseAnalyticsOutput,
  LicenseActionOutput,
  BulkLicenseActionOutput,
  QueryLicensesInput,
  CreateLicenseInput,
  UpdateLicenseInput,
  ValidateLicenseInput,
  LicenseAnalyticsInput,
  BulkCreateLicenseInput,
  BulkUpdateLicenseInput,
  BulkDeleteLicenseInput,
  LicenseStatus,
  LicenseType,
  LICENSE_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/oauth2-client/license/dto';
import { LicenseResponse } from 'src/mkt-core/oauth2-client/license/types';
import { omitUndefined } from 'src/mkt-core/oauth2-client/license/utils';

@Resolver()
@UseGuards(UserAuthGuard)
export class LicenseResolver {
  constructor(private readonly licenseProxyService: LicenseProxyService) {}

  // ==================== QUERIES ====================

  @Query(() => PaginatedLicenseOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.LICENSES_QUERY,
  })
  async licenses(
    @Args('input', { nullable: true }) input?: QueryLicensesInput,
  ): Promise<PaginatedLicenseOutput> {
    const query = omitUndefined({
      page: input?.page,
      limit: input?.limit,
      userId: input?.userId,
      productId: input?.productId,
      status: input?.status,
    });

    const result = await this.licenseProxyService.findAll(query);

    return {
      data: result.data.map((license) => this.mapToLicenseOutput(license)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Query(() => LicenseOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_ID_QUERY,
  })
  async licenseById(@Args('id') id: string): Promise<LicenseOutput> {
    const license = await this.licenseProxyService.findById(id);

    return this.mapToLicenseOutput(license);
  }

  @Query(() => LicenseOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_KEY_QUERY,
  })
  async licenseByKey(
    @Args('licenseKey') licenseKey: string,
  ): Promise<LicenseOutput> {
    const license = await this.licenseProxyService.findByLicenseKey(licenseKey);

    return this.mapToLicenseOutput(license);
  }

  @Query(() => LicenseValidationOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.VALIDATE_LICENSE_QUERY,
  })
  async validateLicense(
    @Args('input') input: ValidateLicenseInput,
  ): Promise<LicenseValidationOutput> {
    const payload = {
      licenseKey: input.licenseKey,
      ...omitUndefined({ productId: input.productId }),
    };

    const result = await this.licenseProxyService.validate(payload);

    return {
      isValid: result.isValid,
      reason: result.reason,
      license: result.license
        ? this.mapToLicenseOutput(result.license)
        : undefined,
    };
  }

  @Query(() => LicenseAnalyticsOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_ANALYTICS_QUERY,
  })
  async licenseAnalytics(
    @Args('input', { nullable: true }) input?: LicenseAnalyticsInput,
  ): Promise<LicenseAnalyticsOutput> {
    const query = omitUndefined({
      productId: input?.productId,
      startDate: input?.startDate,
      endDate: input?.endDate,
      groupBy: input?.groupBy,
    });

    const result = await this.licenseProxyService.getAnalytics(query);

    return {
      total: result.total,
      byStatus: result.byStatus,
      queryPeriod: result.queryPeriod,
    };
  }

  // ==================== MUTATIONS ====================

  @Mutation(() => LicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.CREATE_LICENSE_MUTATION,
  })
  async createLicense(
    @Args('input') input: CreateLicenseInput,
  ): Promise<LicenseActionOutput> {
    const payload = {
      productPackageId: input.productPackageId,
      productId: input.productId,
      userId: input.userId,
      ...omitUndefined({ maxDevices: input.maxDevices }),
    };

    const license = await this.licenseProxyService.create(payload);

    return {
      success: true,
      message: LICENSE_SUCCESS_MESSAGES.CREATED,
      license: this.mapToLicenseOutput(license),
    };
  }

  @Mutation(() => LicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.UPDATE_LICENSE_MUTATION,
  })
  async updateLicense(
    @Args('id') id: string,
    @Args('input') input: UpdateLicenseInput,
  ): Promise<LicenseActionOutput> {
    const payload = omitUndefined({
      type: input.type,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      maxDevices: input.maxDevices,
      metadata: input.metadata,
      updatedBy: input.updatedBy,
    });

    const license = await this.licenseProxyService.update(id, payload);

    return {
      success: true,
      message: LICENSE_SUCCESS_MESSAGES.UPDATED,
      license: this.mapToLicenseOutput(license),
    };
  }

  @Mutation(() => LicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.DELETE_LICENSE_MUTATION,
  })
  async deleteLicense(@Args('id') id: string): Promise<LicenseActionOutput> {
    await this.licenseProxyService.remove(id);

    return {
      success: true,
      message: LICENSE_SUCCESS_MESSAGES.DELETED,
    };
  }

  @Mutation(() => LicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.ACTIVATE_LICENSE_MUTATION,
  })
  async activateLicense(@Args('id') id: string): Promise<LicenseActionOutput> {
    const license = await this.licenseProxyService.activate(id);

    return {
      success: true,
      message: LICENSE_SUCCESS_MESSAGES.ACTIVATED,
      license: this.mapToLicenseOutput(license),
    };
  }

  @Mutation(() => LicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.REVOKE_LICENSE_MUTATION,
  })
  async revokeLicense(@Args('id') id: string): Promise<LicenseActionOutput> {
    const license = await this.licenseProxyService.revoke(id);

    return {
      success: true,
      message: LICENSE_SUCCESS_MESSAGES.REVOKED,
      license: this.mapToLicenseOutput(license),
    };
  }

  // ==================== BULK MUTATIONS ====================

  @Mutation(() => BulkLicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.BULK_CREATE_LICENSE_MUTATION,
  })
  async bulkCreateLicenses(
    @Args('input') input: BulkCreateLicenseInput,
  ): Promise<BulkLicenseActionOutput> {
    const licenses = await this.licenseProxyService.bulkCreate({
      items: input.items.map((item) => ({
        productPackageId: item.productPackageId,
        productId: item.productId,
        userId: item.userId,
        ...omitUndefined({ maxDevices: item.maxDevices }),
      })),
    });

    return {
      success: true,
      message: LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.created(licenses.length),
      licenses: licenses.map((license) => this.mapToLicenseOutput(license)),
      count: licenses.length,
    };
  }

  @Mutation(() => BulkLicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.BULK_UPDATE_LICENSE_MUTATION,
  })
  async bulkUpdateLicenses(
    @Args('input') input: BulkUpdateLicenseInput,
  ): Promise<BulkLicenseActionOutput> {
    const licenses = await this.licenseProxyService.bulkUpdate({
      items: input.items.map((item) => ({
        id: item.id,
        updates: omitUndefined({
          type: item.updates.type,
          status: item.updates.status,
          startDate: item.updates.startDate,
          endDate: item.updates.endDate,
          maxDevices: item.updates.maxDevices,
          metadata: item.updates.metadata,
          updatedBy: item.updates.updatedBy,
        }),
      })),
    });

    return {
      success: true,
      message: LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.updated(licenses.length),
      licenses: licenses.map((license) => this.mapToLicenseOutput(license)),
      count: licenses.length,
    };
  }

  @Mutation(() => BulkLicenseActionOutput, {
    description: LICENSE_GRAPHQL_DESCRIPTIONS.BULK_DELETE_LICENSE_MUTATION,
  })
  async bulkDeleteLicenses(
    @Args('input') input: BulkDeleteLicenseInput,
  ): Promise<BulkLicenseActionOutput> {
    await this.licenseProxyService.bulkDelete({
      ids: input.ids,
    });

    return {
      success: true,
      message: LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.deleted(input.ids.length),
      count: input.ids.length,
    };
  }

  // ==================== HELPERS ====================

  private mapToLicenseOutput(license: LicenseResponse): LicenseOutput {
    return {
      id: license.id,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt,
      deletedAt: license.deletedAt ?? undefined,
      createdBy: license.createdBy ?? undefined,
      updatedBy: license.updatedBy ?? undefined,
      version: license.version,
      licenseKey: license.licenseKey,
      type: license.type as LicenseType,
      originalType: license.originalType as LicenseType,
      status: license.status as LicenseStatus,
      startDate: license.startDate ?? undefined,
      endDate: license.endDate ?? undefined,
      maxDevices: license.maxDevices,
      metadata: license.metadata,
      userId: license.userId,
      productId: license.productId,
      product: license.product
        ? {
            ...license.product,
            deletedAt: license.product.deletedAt ?? undefined,
            createdBy: license.product.createdBy ?? undefined,
            updatedBy: license.product.updatedBy ?? undefined,
            iconUrl: license.product.iconUrl ?? undefined,
            bannerUrl: license.product.bannerUrl ?? undefined,
            name: license.product.name ?? undefined,
            description: license.product.description ?? undefined,
          }
        : undefined,
    };
  }
}
