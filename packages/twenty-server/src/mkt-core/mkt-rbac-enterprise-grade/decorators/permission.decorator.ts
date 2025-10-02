/**
 * Permission Decorator for Enterprise RBAC
 * Optimized for SIMPLIFIED 6-step CRUD-only validation
 */

import { SetMetadata } from '@nestjs/common';

import { PermissionAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Permission metadata interface
 * Designed for SIMPLIFIED mode: module + CRUD actions
 */
export interface PermissionMetadata {
  // ========== CORE (Required) ==========
  /**
   * Resource/Module name (e.g., 'ORDERS', 'CUSTOMERS', 'PRODUCTS')
   * This is the primary permission scope
   *
   * Optional at method-level if defined at class-level (will be inherited)
   * Required at class-level if not defined on methods
   */
  resource?: string;

  /**
   * CRUD Action: READ | CREATE | UPDATE | DELETE
   */
  action: PermissionAction;

  // ========== RECORD IDENTIFICATION (Optional) ==========
  /**
   * Parameter name containing the record ID
   * Used to extract recordId from method arguments
   *
   * @example
   * // From @Args('id')
   * recordIdParam: 'id'
   *
   * // From @Args('orderId')
   * recordIdParam: 'orderId'
   */
  recordIdParam?: string;

  /**
   * Path to record ID in input object
   * Used when recordId is nested in input object
   *
   * @example
   * // From input.id
   * recordIdPath: 'input.id'
   *
   * // From input.data.orderId
   * recordIdPath: 'input.data.orderId'
   */
  recordIdPath?: string;

  // ========== PERFORMANCE OPTIMIZATION (Optional) ==========
  /**
   * Enable caching for this permission check
   * Default: true in SIMPLIFIED mode
   */
  enableCache?: boolean;

  /**
   * Cache TTL override in milliseconds
   * Default: Uses mode-specific TTL (10min for SIMPLIFIED, 30min for FULL)
   */
  cacheTTL?: number;

  // ========== ERROR HANDLING (Optional) ==========
  /**
   * Custom error message for permission denial
   * Provides better UX than generic error messages
   *
   * @example
   * errorMessage: 'Bạn không có quyền xóa đơn hàng này'
   */
  errorMessage?: string;

  /**
   * Allow anonymous (unauthenticated) access
   * Default: false
   * Use for public endpoints
   */
  allowAnonymous?: boolean;

  // ========== ADVANCED (Optional - for FULL mode or future features) ==========
  /**
   * @deprecated Use 'resource' instead
   * Kept for backward compatibility
   */
  objectName?: string;

  /**
   * Skip permission validation entirely
   * Use with caution - only for internal/system endpoints
   * Default: false
   */
  skipValidation?: boolean;

  /**
   * Require ownership check (Step 6 in FULL mode)
   * Only applicable in FULL validation mode
   * Default: false
   */
  requireOwnership?: boolean;

  /**
   * Allowed roles (legacy support)
   * @deprecated Use permission templates instead
   */
  allowedRoles?: string[];

  /**
   * Minimum hierarchy level required (1-11, where 1=CEO, 11=Intern)
   * Only applicable in FULL validation mode with hierarchy
   * Default: no minimum level
   */
  minimumLevel?: number;

  /**
   * Required fields that must be present in resource
   * For field-level permission control (future feature)
   */
  requiredFields?: string[];
}

/**
 * Permission metadata decorator key
 */
export const PERMISSION_KEY = 'enterprise_rbac_permission';

/**
 * Permission decorator for controllers and resolvers
 * Supports both class-level and method-level decoration
 *
 * ## Basic Usage (SIMPLIFIED mode - CRUD only)
 *
 * @example
 * // Class-level: Default READ permission
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.READ
 * })
 * export class MktOrderResolver { }
 *
 * @example
 * // Method-level: CREATE permission
 * @Mutation(() => Order)
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.CREATE
 * })
 * async createOrder(@Args('input') input: CreateOrderInput) { }
 *
 * ## Advanced Usage
 *
 * @example
 * // With record ID extraction
 * @Mutation(() => Order)
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.UPDATE,
 *   recordIdParam: 'id'  // Extract from @Args('id')
 * })
 * async updateOrder(@Args('id') id: string, @Args('input') input: UpdateOrderInput) { }
 *
 * @example
 * // With record ID from input object
 * @Mutation(() => Order)
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.UPDATE,
 *   recordIdPath: 'input.id'  // Extract from input.id
 * })
 * async updateOrder(@Args('input') input: UpdateOrderInput) { }
 *
 * @example
 * // With custom error message
 * @Mutation(() => Order)
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.DELETE,
 *   recordIdParam: 'id',
 *   errorMessage: 'Bạn không có quyền xóa đơn hàng này'
 * })
 * async deleteOrder(@Args('id') id: string) { }
 *
 * @example
 * // Disable cache for sensitive data
 * @Query(() => SalaryOutput)
 * @Permission({
 *   resource: 'SALARY_DATA',
 *   action: PermissionAction.READ,
 *   enableCache: false  // Real-time permission check
 * })
 * async getSalary(@Args('userId') userId: string) { }
 *
 * @example
 * // Public endpoint (allow anonymous)
 * @Query(() => Product)
 * @Permission({
 *   resource: 'PRODUCTS',
 *   action: PermissionAction.READ,
 *   allowAnonymous: true
 * })
 * async getPublicProduct(@Args('id') id: string) { }
 *
 * @example
 * // FULL mode with ownership check
 * @Mutation(() => Order)
 * @Permission({
 *   resource: 'ORDERS',
 *   action: PermissionAction.UPDATE,
 *   recordIdParam: 'id',
 *   requireOwnership: true,  // Only owner can update
 *   minimumLevel: 7  // Minimum level: Manager
 * })
 * async updateOrder(@Args('id') id: string) { }
 *
 * ## Backward Compatibility
 *
 * @example
 * // Old format (still supported)
 * @Permission({
 *   action: PermissionAction.READ,
 *   objectName: 'ORDERS'  // Will use 'resource' internally
 * })
 *
 * @param metadata Permission metadata configuration
 */
export const Permission = (metadata: PermissionMetadata) => {
  // Backward compatibility: objectName → resource
  if (metadata.objectName && !metadata.resource) {
    metadata.resource = metadata.objectName;
  }

  // Validation: Ensure required fields
  // Note: resource can be optional at method-level (inherited from class-level)
  // The Guard will merge class-level and method-level metadata

  if (!metadata.action) {
    throw new Error(
      '@Permission decorator requires "action" field (e.g., action: PermissionAction.READ)',
    );
  }

  return SetMetadata(PERMISSION_KEY, metadata);
};

/**
 * Type-safe permission decorator builder
 * Provides better IDE autocomplete and type safety
 */
export class PermissionBuilder {
  private metadata: Partial<PermissionMetadata> = {};

  /**
   * Set resource/module name
   */
  forResource(resource: string): this {
    this.metadata.resource = resource;

    return this;
  }

  /**
   * Set CRUD action
   */
  withAction(action: PermissionAction): this {
    this.metadata.action = action;

    return this;
  }

  /**
   * Extract record ID from parameter
   */
  withRecordIdParam(paramName: string): this {
    this.metadata.recordIdParam = paramName;

    return this;
  }

  /**
   * Extract record ID from input object path
   */
  withRecordIdPath(path: string): this {
    this.metadata.recordIdPath = path;

    return this;
  }

  /**
   * Set custom error message
   */
  withErrorMessage(message: string): this {
    this.metadata.errorMessage = message;

    return this;
  }

  /**
   * Enable/disable caching
   */
  withCache(enabled: boolean, ttl?: number): this {
    this.metadata.enableCache = enabled;
    if (ttl !== undefined) {
      this.metadata.cacheTTL = ttl;
    }

    return this;
  }

  /**
   * Allow anonymous access
   */
  allowAnonymous(): this {
    this.metadata.allowAnonymous = true;

    return this;
  }

  /**
   * Require ownership check
   */
  requireOwnership(): this {
    this.metadata.requireOwnership = true;

    return this;
  }

  /**
   * Set minimum hierarchy level
   */
  withMinimumLevel(level: number): this {
    this.metadata.minimumLevel = level;

    return this;
  }

  /**
   * Build the decorator
   */
  build() {
    return Permission(this.metadata as PermissionMetadata);
  }
}

/**
 * Fluent API for building permissions
 *
 * @example
 * @PermissionBuilder
 *   .forResource('ORDERS')
 *   .withAction(PermissionAction.UPDATE)
 *   .withRecordIdParam('id')
 *   .withErrorMessage('Cannot update order')
 *   .build()
 */
export const PermissionFor = (resource: string) =>
  new PermissionBuilder().forResource(resource);
