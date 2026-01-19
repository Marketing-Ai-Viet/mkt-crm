import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  PAYMENT_DEADLINE_CONFIG_TYPE,
  PAYMENT_DEADLINE_CONFIG_TYPE_OPTIONS,
  PaymentDeadlineConfigTypeValue,
} from 'src/mkt-core/order/constants/payment-deadline.constants';

/**
 * Entity name for mktPaymentDeadlineConfig
 * Used by block hooks and other configurations
 */
export const MKT_PAYMENT_DEADLINE_CONFIG_ENTITY_NAME =
  'mktPaymentDeadlineConfig';

/**
 * Payment Deadline Config WorkspaceEntity
 *
 * Stores payment deadline configuration by type:
 * - GLOBAL: Default setting for all orders (targetId = null)
 * - PRODUCT: Product-specific deadline (targetId = productId)
 * - CUSTOMER_TYPE: Customer type-based deadline (targetId = customerType value)
 * - RESELLER_TIER: Reseller tier-based deadline (targetId = resellerTierId)
 *
 * Priority for resolution:
 * MANUAL > RESELLER_TIER > CUSTOMER_TYPE > PRODUCT > GLOBAL
 *
 * Note: MANUAL is not stored - it's passed directly in the API call
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPaymentDeadlineConfig,
  namePlural: `${MKT_PAYMENT_DEADLINE_CONFIG_ENTITY_NAME}s`,
  labelSingular: msg`Payment Deadline Config`,
  labelPlural: msg`Payment Deadline Configs`,
  description: msg`Configuration for payment deadline by type (global, product, customer type, reseller tier)`,
  icon: 'IconClock',
  labelIdentifierStandardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.configType,
})
export class MktPaymentDeadlineConfigWorkspaceEntity extends BaseWorkspaceEntity {
  /**
   * Config type determines the scope of this configuration
   * - GLOBAL: Applies to all orders
   * - PRODUCT: Applies to orders containing specific product
   * - CUSTOMER_TYPE: Applies to customers of specific type
   * - RESELLER_TIER: Applies to resellers of specific tier
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.configType,
    type: FieldMetadataType.SELECT,
    label: msg`Config Type`,
    description: msg`Type of configuration (GLOBAL, PRODUCT, CUSTOMER_TYPE, RESELLER_TIER)`,
    icon: 'IconCategory',
    options: PAYMENT_DEADLINE_CONFIG_TYPE_OPTIONS,
    defaultValue: `'${PAYMENT_DEADLINE_CONFIG_TYPE.GLOBAL}'`,
  })
  configType: PaymentDeadlineConfigTypeValue;

  /**
   * Target ID for the configuration
   * - GLOBAL: null (no specific target)
   * - PRODUCT: productId from MKT Server
   * - CUSTOMER_TYPE: customer type value (VIP, ENTERPRISE, STANDARD)
   * - RESELLER_TIER: reseller tier ID
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.targetId,
    type: FieldMetadataType.TEXT,
    label: msg`Target ID`,
    description: msg`ID of the target (product ID, customer type value, or reseller tier ID). Null for GLOBAL type.`,
    icon: 'IconTarget',
  })
  @WorkspaceIsNullable()
  targetId?: string | null;

  /**
   * Payment deadline in hours from order confirmation
   * Min: 1 hour, Max: 720 hours (30 days)
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.deadlineHours,
    type: FieldMetadataType.NUMBER,
    label: msg`Deadline Hours`,
    description: msg`Payment deadline in hours from order confirmation (1-720)`,
    icon: 'IconHourglass',
    defaultValue: 24,
  })
  deadlineHours: number;

  /**
   * Whether this configuration is active
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this configuration is currently active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  isActive: boolean;

  /**
   * Priority for conflict resolution
   * Lower number = higher priority
   * Used when multiple configs of the same type match
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority for conflict resolution (lower = higher priority)`,
    icon: 'IconSortAscending',
    defaultValue: 100,
  })
  @WorkspaceIsNullable()
  priority?: number;

  /**
   * Description or note for this configuration
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Description or note for this configuration`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  description?: string | null;

  /**
   * Position for ordering in list views
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  /**
   * Actor who created this configuration
   */
  @WorkspaceField({
    standardId: MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
