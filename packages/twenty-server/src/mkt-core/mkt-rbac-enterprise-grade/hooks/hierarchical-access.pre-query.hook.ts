/**
 * HierarchicalAccessPreQueryHook
 *
 * Pre-query hooks that apply hierarchical access policy to findMany/findOne operations.
 * Automatically filters data based on user's hierarchy level and access scope.
 *
 * Access Scope by Hierarchy Level:
 * - Executive (1-3): ALL - No filter applied
 * - Upper Management (4-6): REPORTING_CHAIN - Filter by reporting chain
 * - Manager (7): DIRECT_SUBORDINATES - Filter by direct subordinates
 * - Staff (8-11): SELF - Filter to only own records
 */

import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import {
  FindManyResolverArgs,
  FindOneResolverArgs,
} from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { ObjectRecordOrderBy } from 'src/engine/api/graphql/workspace-query-builder/interfaces/object-record.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { HierarchicalAccessEvaluatorService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchical-access-evaluator.service';
import { RbacContextService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import { ACCESS_SCOPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/policy.constants';

// ============================================
// CONSTANTS
// ============================================

const HOOK_LOG_CONTEXT = 'RBAC:HierarchicalAccessHook';

/**
 * Resources that hierarchical access policy applies to
 * These are resources with createdById field
 */
export const HIERARCHICAL_ACCESS_RESOURCES = [
  'mktOrder',
  'mktInvoice',
  'mktLicense',
  'mktCustomer',
  'mktPayment',
  'mktContract',
  'task',
  'note',
  'opportunity',
] as const;

export type HierarchicalAccessResource =
  (typeof HIERARCHICAL_ACCESS_RESOURCES)[number];

/**
 * Check if a resource should have hierarchical access applied
 */
const isHierarchicalAccessResource = (
  objectName: string,
): objectName is HierarchicalAccessResource =>
  HIERARCHICAL_ACCESS_RESOURCES.includes(
    objectName as HierarchicalAccessResource,
  );

// ============================================
// FILTER TYPES
// ============================================

type HierarchicalFilter = {
  createdById?: {
    in?: string[];
    eq?: string;
  };
  or?: HierarchicalFilter[];
  and?: HierarchicalFilter[];
};

// ============================================
// HELPER SERVICE
// ============================================

/**
 * Service providing hierarchical filter logic
 */
@Injectable()
export class HierarchicalAccessFilterService {
  private readonly logger = new Logger(HOOK_LOG_CONTEXT);

  constructor(
    private readonly hierarchicalAccessEvaluator: HierarchicalAccessEvaluatorService,
    private readonly rbacContextService: RbacContextService,
  ) {}

  /**
   * Build filter for hierarchical access
   * Returns null if no filter should be applied (full access)
   */
  async buildHierarchicalFilter(
    authContext: AuthContext,
    objectName: string,
  ): Promise<HierarchicalFilter | null> {
    // Skip if not a hierarchical access resource
    if (!isHierarchicalAccessResource(objectName)) {
      this.logger.debug(
        `Skipping hierarchical filter for non-hierarchical resource: ${objectName}`,
      );

      return null;
    }

    // Validate auth context
    if (!authContext.workspace?.id || !authContext.workspaceMemberId) {
      this.logger.warn(
        'Missing workspace or workspaceMemberId in auth context',
      );

      return null;
    }

    const workspaceId = authContext.workspace.id;
    const workspaceMemberId = authContext.workspaceMemberId;

    // Get user context
    const userContext = await this.rbacContextService.resolveContext(
      workspaceMemberId,
      workspaceId,
    );

    if (!userContext) {
      this.logger.warn(
        `Could not resolve user context for member ${workspaceMemberId}`,
      );

      return null;
    }

    // Get access scope based on hierarchy level
    const accessScope = this.hierarchicalAccessEvaluator.getDefaultAccessScope(
      userContext.hierarchyLevel,
    );

    this.logger.debug(
      `User ${workspaceMemberId} has access scope: ${accessScope} (level: ${userContext.hierarchyLevel})`,
    );

    // Apply filter based on access scope
    switch (accessScope) {
      case ACCESS_SCOPE.ALL:
        // Executive level - no filter needed
        this.logger.debug('Executive level - no hierarchical filter applied');

        return null;

      case ACCESS_SCOPE.REPORTING_CHAIN: {
        // Upper management - can see reporting chain
        const accessibleIds = [
          workspaceMemberId,
          ...userContext.subordinateMemberIds,
          ...userContext.teamMemberIds,
        ];

        this.logger.debug(
          `REPORTING_CHAIN filter - ${accessibleIds.length} accessible members`,
        );

        return {
          createdById: {
            in: accessibleIds,
          },
        };
      }

      case ACCESS_SCOPE.DIRECT_SUBORDINATES: {
        // Manager - can see direct subordinates only
        const accessibleIds = [
          workspaceMemberId,
          ...userContext.subordinateMemberIds,
        ];

        this.logger.debug(
          `DIRECT_SUBORDINATES filter - ${accessibleIds.length} accessible members`,
        );

        return {
          createdById: {
            in: accessibleIds,
          },
        };
      }

      case ACCESS_SCOPE.SELF:
      default:
        // Staff - can only see own records
        this.logger.debug('SELF filter - only own records');

        return {
          createdById: {
            eq: workspaceMemberId,
          },
        };
    }
  }

  /**
   * Merge hierarchical filter with existing filter
   */
  mergeFilters<T extends HierarchicalFilter>(
    existingFilter: T | undefined,
    hierarchicalFilter: HierarchicalFilter | null,
  ): T | undefined {
    if (!hierarchicalFilter) {
      return existingFilter;
    }

    if (!existingFilter) {
      return hierarchicalFilter as T;
    }

    // Merge using AND logic
    return {
      and: [existingFilter, hierarchicalFilter],
    } as T;
  }
}

// ============================================
// HOOKS FOR mktOrder
// ============================================

@Injectable()
@WorkspaceQueryHook('mktOrder.findMany')
export class MktOrderHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktOrder.findOne')
export class MktOrderHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

// ============================================
// HOOKS FOR mktInvoice
// ============================================

@Injectable()
@WorkspaceQueryHook('mktInvoice.findMany')
export class MktInvoiceHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktInvoice.findOne')
export class MktInvoiceHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

// ============================================
// HOOKS FOR mktLicense
// ============================================

@Injectable()
@WorkspaceQueryHook('mktLicense.findMany')
export class MktLicenseHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktLicense.findOne')
export class MktLicenseHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

// ============================================
// HOOKS FOR mktCustomer
// ============================================

@Injectable()
@WorkspaceQueryHook('mktCustomer.findMany')
export class MktCustomerHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktCustomer.findOne')
export class MktCustomerHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

// ============================================
// HOOKS FOR mktPayment
// ============================================

@Injectable()
@WorkspaceQueryHook('mktPayment.findMany')
export class MktPaymentHierarchicalAccessFindManyHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<HierarchicalFilter, ObjectRecordOrderBy>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

@Injectable()
@WorkspaceQueryHook('mktPayment.findOne')
export class MktPaymentHierarchicalAccessFindOneHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly filterService: HierarchicalAccessFilterService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: FindOneResolverArgs<HierarchicalFilter>,
  ): Promise<FindOneResolverArgs<HierarchicalFilter>> {
    const filter = await this.filterService.buildHierarchicalFilter(
      authContext,
      objectName,
    );

    payload.filter = this.filterService.mergeFilters(payload.filter, filter);

    return payload;
  }
}

// ============================================
// HOOK PROVIDERS ARRAY
// ============================================

/**
 * All hierarchical access hook providers
 * Import this array into the module providers
 */
export const HIERARCHICAL_ACCESS_HOOKS = [
  // Core filter service
  HierarchicalAccessFilterService,
  // mktOrder
  MktOrderHierarchicalAccessFindManyHook,
  MktOrderHierarchicalAccessFindOneHook,
  // mktInvoice
  MktInvoiceHierarchicalAccessFindManyHook,
  MktInvoiceHierarchicalAccessFindOneHook,
  // mktLicense
  MktLicenseHierarchicalAccessFindManyHook,
  MktLicenseHierarchicalAccessFindOneHook,
  // mktCustomer
  MktCustomerHierarchicalAccessFindManyHook,
  MktCustomerHierarchicalAccessFindOneHook,
  // mktPayment
  MktPaymentHierarchicalAccessFindManyHook,
  MktPaymentHierarchicalAccessFindOneHook,
];
