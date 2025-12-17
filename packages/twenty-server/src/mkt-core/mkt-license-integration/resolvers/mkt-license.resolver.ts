import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services';
import {
  MKT_LICENSE_MESSAGES,
  MKT_LICENSE_BULK_SUCCESS_MESSAGE_BUILDER,
} from 'src/mkt-core/mkt-license-integration/message';
import {
  MktLicenseOutput,
  MktPaginatedLicenseOutput,
  MktLicenseValidationOutput,
  MktLicenseAnalyticsOutput,
  MktLicenseActionOutput,
  MktBulkLicenseActionOutput,
  MktQueryLicensesInput,
  MktCreateLicenseInput,
  MktUpdateLicenseInput,
  MktValidateLicenseInput,
  MktLicenseAnalyticsInput,
  MktBulkCreateLicenseInput,
  MktBulkUpdateLicenseInput,
  MktBulkDeleteLicenseInput,
  MKT_LICENSE_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-license-integration/dto';
import {
  omitUndefined,
  mapLicenseToOutput,
} from 'src/mkt-core/mkt-license-integration/utils';

@Resolver()
@UseGuards(UserAuthGuard)
export class MktLicenseResolver {
  constructor(private readonly licenseProxyService: MktLicenseProxyService) {}

  // ==================== QUERIES ====================

  @Query(() => MktPaginatedLicenseOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSES_QUERY,
  })
  async mktLicenses(
    @Args('input', { nullable: true }) input?: MktQueryLicensesInput,
  ): Promise<MktPaginatedLicenseOutput> {
    const query = omitUndefined({
      page: input?.page,
      limit: input?.limit,
      userId: input?.userId,
      productId: input?.productId,
      status: input?.status,
    });

    const result = await this.licenseProxyService.findAll(query);

    return {
      data: result.data.map((license) => mapLicenseToOutput(license)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Query(() => MktLicenseOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_ID_QUERY,
  })
  async mktLicenseById(@Args('id') id: string): Promise<MktLicenseOutput> {
    const license = await this.licenseProxyService.findById(id);

    return mapLicenseToOutput(license);
  }

  @Query(() => MktLicenseOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_KEY_QUERY,
  })
  async mktLicenseByKey(
    @Args('licenseKey') licenseKey: string,
  ): Promise<MktLicenseOutput> {
    const license = await this.licenseProxyService.findByLicenseKey(licenseKey);

    return mapLicenseToOutput(license);
  }

  @Query(() => MktLicenseValidationOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.VALIDATE_LICENSE_QUERY,
  })
  async mktValidateLicense(
    @Args('input') input: MktValidateLicenseInput,
  ): Promise<MktLicenseValidationOutput> {
    const payload = {
      licenseKey: input.licenseKey,
      ...omitUndefined({ productId: input.productId }),
    };

    const result = await this.licenseProxyService.validate(payload);

    return {
      isValid: result.isValid,
      reason: result.reason,
      license: result.license ? mapLicenseToOutput(result.license) : undefined,
    };
  }

  @Query(() => MktLicenseAnalyticsOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_ANALYTICS_QUERY,
  })
  async mktLicenseAnalytics(
    @Args('input', { nullable: true }) input?: MktLicenseAnalyticsInput,
  ): Promise<MktLicenseAnalyticsOutput> {
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

  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.CREATE_LICENSE_MUTATION,
  })
  async mktCreateLicense(
    @Args('input') input: MktCreateLicenseInput,
  ): Promise<MktLicenseActionOutput> {
    const payload = {
      productPackageId: input.productPackageId,
      productId: input.productId,
      userId: input.userId,
      ...omitUndefined({ maxDevices: input.maxDevices }),
    };

    const license = await this.licenseProxyService.create(payload);

    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.CREATED,
      license: mapLicenseToOutput(license),
    };
  }

  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.UPDATE_LICENSE_MUTATION,
  })
  async mktUpdateLicense(
    @Args('id') id: string,
    @Args('input') input: MktUpdateLicenseInput,
  ): Promise<MktLicenseActionOutput> {
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
      message: MKT_LICENSE_MESSAGES.SUCCESS.UPDATED,
      license: mapLicenseToOutput(license),
    };
  }

  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.DELETE_LICENSE_MUTATION,
  })
  async mktDeleteLicense(
    @Args('id') id: string,
  ): Promise<MktLicenseActionOutput> {
    await this.licenseProxyService.remove(id);

    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.DELETED,
    };
  }

  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.ACTIVATE_LICENSE_MUTATION,
  })
  async mktActivateLicense(
    @Args('id') id: string,
  ): Promise<MktLicenseActionOutput> {
    const license = await this.licenseProxyService.activate(id);

    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.ACTIVATED,
      license: mapLicenseToOutput(license),
    };
  }

  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.REVOKE_LICENSE_MUTATION,
  })
  async mktRevokeLicense(
    @Args('id') id: string,
  ): Promise<MktLicenseActionOutput> {
    const license = await this.licenseProxyService.revoke(id);

    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.REVOKED,
      license: mapLicenseToOutput(license),
    };
  }

  // ==================== BULK MUTATIONS ====================

  @Mutation(() => MktBulkLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.BULK_CREATE_LICENSE_MUTATION,
  })
  async mktBulkCreateLicenses(
    @Args('input') input: MktBulkCreateLicenseInput,
  ): Promise<MktBulkLicenseActionOutput> {
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
      message: MKT_LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.created(
        licenses.length,
      ),
      licenses: licenses.map((license) => mapLicenseToOutput(license)),
      count: licenses.length,
    };
  }

  @Mutation(() => MktBulkLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.BULK_UPDATE_LICENSE_MUTATION,
  })
  async mktBulkUpdateLicenses(
    @Args('input') input: MktBulkUpdateLicenseInput,
  ): Promise<MktBulkLicenseActionOutput> {
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
      message: MKT_LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.updated(
        licenses.length,
      ),
      licenses: licenses.map((license) => mapLicenseToOutput(license)),
      count: licenses.length,
    };
  }

  @Mutation(() => MktBulkLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.BULK_DELETE_LICENSE_MUTATION,
  })
  async mktBulkDeleteLicenses(
    @Args('input') input: MktBulkDeleteLicenseInput,
  ): Promise<MktBulkLicenseActionOutput> {
    await this.licenseProxyService.bulkDelete({
      ids: input.ids,
    });

    return {
      success: true,
      message: MKT_LICENSE_BULK_SUCCESS_MESSAGE_BUILDER.deleted(
        input.ids.length,
      ),
      count: input.ids.length,
    };
  }
}
