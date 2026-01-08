/**
 * Entity Ownership Utility
 *
 * Provides utilities for handling createdById and accountOwnerId
 * fields on workspace entities.
 *
 * Usage:
 * - Use `buildOwnershipFields` when creating entities to set createdById and accountOwnerId
 * - By default, both fields are set to the workspaceMemberId
 * - Can override accountOwnerId separately if needed
 */

// ============================================
// TYPES
// ============================================

/**
 * Input for building ownership fields
 */
export type OwnershipFieldsInput = {
  /** The workspace member ID who is creating/owning the entity */
  workspaceMemberId: string | undefined;
  /** Optional: explicitly set a different account owner */
  accountOwnerId?: string;
};

/**
 * Output ownership fields to spread into entity creation
 * - createdById can be null (nullable relation)
 * - accountOwnerId can be undefined (non-nullable relation, omit if not set)
 */
export type OwnershipFields = {
  createdById: string | null;
  accountOwnerId?: string;
};

// ============================================
// UTILITY CLASS
// ============================================

export const EntityOwnershipUtil = {
  /**
   * Build ownership fields for entity creation
   *
   * By default:
   * - createdById = workspaceMemberId (null if not provided)
   * - accountOwnerId = workspaceMemberId (omitted if not provided)
   *
   * @param input - OwnershipFieldsInput
   * @returns OwnershipFields to spread into entity creation
   *
   * @example
   * const ownershipFields = EntityOwnershipUtil.buildOwnershipFields({
   *   workspaceMemberId: context.workspaceMemberId,
   * });
   *
   * const order = repository.create({
   *   ...orderData,
   *   ...ownershipFields,
   * });
   */
  buildOwnershipFields(input: OwnershipFieldsInput): OwnershipFields {
    const { workspaceMemberId, accountOwnerId } = input;

    const result: OwnershipFields = {
      createdById: workspaceMemberId ?? null,
    };

    // Determine accountOwnerId value
    const resolvedAccountOwnerId = accountOwnerId ?? workspaceMemberId;

    // Only include accountOwnerId if it has a value
    if (resolvedAccountOwnerId) {
      result.accountOwnerId = resolvedAccountOwnerId;
    }

    return result;
  },

  /**
   * Check if entity has valid ownership
   *
   * @param entity - Entity with ownership fields
   * @returns true if entity has valid ownership
   */
  hasValidOwnership(entity: Partial<OwnershipFields>): boolean {
    return entity.createdById !== null && entity.createdById !== undefined;
  },
} as const;
