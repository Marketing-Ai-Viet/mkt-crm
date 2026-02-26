import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
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
  MktTrialLicenseActionOutput,
  MktQueryLicensesInput,
  MktCreateLicenseInput,
  MktUpdateLicenseInput,
  MktValidateLicenseInput,
  MktLicenseAnalyticsInput,
  MktBulkCreateLicenseInput,
  MktBulkUpdateLicenseInput,
  MktBulkDeleteLicenseInput,
  MktCreateTrialLicenseInput,
  MKT_LICENSE_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-license-integration/dto';
import {
  omitUndefined,
  mapLicenseToOutput,
  emptyToUndefined,
} from 'src/mkt-core/mkt-license-integration/utils';
import { LICENSE_DATA_SCOPE } from 'src/mkt-core/mkt-license-integration/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

@Resolver()
@UseGuards(UserAuthGuard)
export class MktLicenseResolver {
  constructor(private readonly licenseProxyService: MktLicenseProxyService) {}

  // ==================== QUERIES ====================

  @DataScope(LICENSE_DATA_SCOPE.QUERY_LIST)
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

  @DataScope(LICENSE_DATA_SCOPE.QUERY_SINGLE)
  @Query(() => MktLicenseOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_ID_QUERY,
  })
  async mktLicenseById(@Args('id') id: string): Promise<MktLicenseOutput> {
    const license = await this.licenseProxyService.findById(id);

    return mapLicenseToOutput(license);
  }

  @DataScope(LICENSE_DATA_SCOPE.QUERY_SINGLE)
  @Query(() => MktLicenseOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.LICENSE_BY_KEY_QUERY,
  })
  async mktLicenseByKey(
    @Args('licenseKey') licenseKey: string,
  ): Promise<MktLicenseOutput> {
    const license = await this.licenseProxyService.findByLicenseKey(licenseKey);

    return mapLicenseToOutput(license);
  }

  @DataScope(LICENSE_DATA_SCOPE.QUERY_SINGLE)
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

  @DataScope(LICENSE_DATA_SCOPE.QUERY_AGGREGATION)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_CREATE)
  @Mutation(() => MktLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.CREATE_LICENSE_MUTATION,
  })
  async mktCreateLicense(
    @Args('input') input: MktCreateLicenseInput,
  ): Promise<MktLicenseActionOutput> {
    const payload = {
      productPackageId: input.productPackageId,
      productId: input.productId,
      email: input.email,
      ...omitUndefined({ maxDevices: input.maxDevices }),
    };

    const license = await this.licenseProxyService.create(payload);

    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.CREATED,
      license: mapLicenseToOutput(license),
    };
  }

  /**
   * Create a trial license with simplified flow
   *
   * - Looks up customer email from linkedAccounts (MKT_SERVER provider)
   * - Checks for existing trial license (1 user = 1 trial per product)
   * - Reuses existing trial if found
   * - Creates new trial license if not found
   */
  @DataScope(LICENSE_DATA_SCOPE.MUTATION_CREATE)
  @Mutation(() => MktTrialLicenseActionOutput, {
    description: MKT_LICENSE_GRAPHQL_DESCRIPTIONS.CREATE_TRIAL_LICENSE_MUTATION,
  })
  async mktCreateTrialLicense(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: MktCreateTrialLicenseInput,
  ): Promise<MktTrialLicenseActionOutput> {
    const result = await this.licenseProxyService.createOrReuseTrial({
      productId: input.productId,
      customerId: input.customerId,
      workspaceId,
      trialDays: input.trialDays,
      maxDevices: input.maxDevices,
    });

    // Reused existing trial - return minimal info
    if (result.reused) {
      return {
        success: true,
        message: MKT_LICENSE_MESSAGES.SUCCESS.TRIAL_REUSED,
        license: mapLicenseToOutput(result.license),
        reused: true,
        trialExpiryDate: emptyToUndefined(result.license.endDate),
      };
    }

    // Newly created trial - return full info
    return {
      success: true,
      message: MKT_LICENSE_MESSAGES.SUCCESS.TRIAL_CREATED,
      license: mapLicenseToOutput(result.license),
      reused: false,
      trialExpiryDate: emptyToUndefined(result.license.endDate),
    };
  }

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_UPDATE)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_DELETE)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_STATE_CHANGE)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_STATE_CHANGE)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_BULK_CREATE)
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
        email: item.email,
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_BULK_UPDATE)
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

  @DataScope(LICENSE_DATA_SCOPE.MUTATION_BULK_DELETE)
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
