import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { SEARCH_VECTOR_FIELD } from 'src/engine/metadata-modules/constants/search-vector-field.constants';
import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_ORDER_ITEM_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
  MktSupportedLanguage,
  OrderItemLicense,
  ORDER_ITEM_SOURCE,
  ORDER_ITEM_SOURCE_OPTIONS,
  OrderItemSource,
  ORDER_ITEM_TYPE,
  ORDER_ITEM_TYPE_OPTIONS,
  OrderItemType,
  GenericComboItemSnapshot,
  InternalProductSnapshot,
  InternalVariantSnapshot,
} from 'src/mkt-core/order/types';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const SEARCH_FIELDS_FOR_ORDER_ITEM: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrderItem,
  namePlural: 'orderItems',
  labelSingular: msg`Order Item`,
  labelPlural: msg`Order Items`,
  description: msg`Represents an item in an order.`,
  icon: 'IconShoppingCartCog',
  shortcut: 'OI',
  labelIdentifierStandardId: MKT_ORDER_ITEM_FIELD_IDS.name,
})
//@WorkspaceIsSearchable()
export class MktOrderItemWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.quantity,
    type: FieldMetadataType.NUMBER,
    label: msg`Quantity`,
    description: msg`Quantity of the product`,
    icon: 'IconNumbers',
    defaultValue: 1,
  })
  @WorkspaceIsNullable()
  quantity: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.unitPrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Unit Price`,
    description: msg`Price per unit of the product`,
    icon: 'IconCurrencyDollar',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  unitPrice?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.snapshotProductName,
    type: FieldMetadataType.TEXT,
    label: msg`Snapshot Product Name`,
    description: msg`Snapshot product name`,
  })
  @WorkspaceIsNullable()
  snapshotProductName: string;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.unitName,
    type: FieldMetadataType.TEXT,
    label: msg`Unit Name`,
    description: msg`Unit name`,
  })
  @WorkspaceIsNullable()
  unitName: string;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.taxPercentage,
    type: FieldMetadataType.NUMBER,
    label: msg`Tax Percentage`,
    description: msg`Tax percentage for this line item`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  taxPercentage: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.taxAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Tax Amount`,
    description: msg`Tax amount for this line item`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  taxAmount: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.totalAmountWithTax,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Amount with Tax`,
    description: msg`Total amount with tax for this line item`,
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  totalAmountWithTax: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.totalPrice,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Price`,
    description: msg`Total price for this line item (quantity * unit price)`,
    icon: 'IconCurrencyDollar',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  totalPrice?: number;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.itemDiscount,
    type: FieldMetadataType.NUMBER,
    label: msg`Item Discount`,
    description: msg`Discount amount from promotions for this item`,
    icon: 'IconDiscount',
    defaultValue: 0,
  })
  @WorkspaceIsNullable()
  itemDiscount?: number;

  // ============================================
  // EXTERNAL MKT PRODUCT REFERENCE FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.externalMktProductId,
    type: FieldMetadataType.TEXT,
    label: msg`External Product ID`,
    description: msg`ID of product from MKT Server (UUIDv7)`,
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  externalMktProductId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.externalMktProductCode,
    type: FieldMetadataType.TEXT,
    label: msg`External Product Code`,
    description: msg`Unique code of product from MKT Server`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  externalMktProductCode: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.externalMktPackageId,
    type: FieldMetadataType.TEXT,
    label: msg`External Package ID`,
    description: msg`ID of package from MKT Server`,
    icon: 'IconPackage',
  })
  @WorkspaceIsNullable()
  externalMktPackageId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.externalMktPackageCode,
    type: FieldMetadataType.TEXT,
    label: msg`External Package Code`,
    description: msg`Code of package from MKT Server`,
    icon: 'IconBarcode',
  })
  @WorkspaceIsNullable()
  externalMktPackageCode: string | null;

  // ============================================
  // SNAPSHOT FIELDS - IMMUTABLE AFTER CREATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.snapshotMktProduct,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Product Snapshot`,
    description: msg`Immutable snapshot of MKT product at order time`,
    icon: 'IconCamera',
  })
  @WorkspaceIsNullable()
  snapshotMktProduct: MktProductSnapshot | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.snapshotMktPackage,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Package Snapshot`,
    description: msg`Immutable snapshot of MKT package at order time`,
    icon: 'IconPackage',
  })
  @WorkspaceIsNullable()
  snapshotMktPackage: MktPackageSnapshot | null;

  // ============================================
  // EXTERNAL MKT LICENSE REFERENCE FIELDS
  // ============================================
  /**
   * Array of licenses for this order item
   * Supports multiple licenses per item (e.g., multi-device orders)
   */
  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.licenses,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Licenses`,
    description: msg`Array of licenses with keys and snapshots`,
    icon: 'IconLicense',
  })
  @WorkspaceIsNullable()
  licenses: OrderItemLicense[] | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.maxDevices,
    type: FieldMetadataType.NUMBER,
    label: msg`Max Devices`,
    description: msg`Maximum devices allowed for the license`,
    icon: 'IconDevices',
    defaultValue: 1,
  })
  @WorkspaceIsNullable()
  maxDevices: number | null;

  // ============================================
  // DISPLAY FIELDS (denormalized for quick access)
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.snapshotPackageName,
    type: FieldMetadataType.TEXT,
    label: msg`Package Name (Snapshot)`,
    description: msg`Package name at order time`,
    icon: 'IconTag',
  })
  @WorkspaceIsNullable()
  snapshotPackageName: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.orderLanguage,
    type: FieldMetadataType.TEXT,
    label: msg`Order Language`,
    description: msg`Display language for order (vi/en/ko)`,
    icon: 'IconLanguage',
  })
  @WorkspaceIsNullable()
  orderLanguage: MktSupportedLanguage | null;

  // ============================================
  // COMBO-RELATED FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.itemSource,
    type: FieldMetadataType.SELECT,
    label: msg`Item Source`,
    description: msg`Source of this order item (PRODUCT or COMBO_ITEM)`,
    icon: 'IconSource',
    options: ORDER_ITEM_SOURCE_OPTIONS,
    defaultValue: `'${ORDER_ITEM_SOURCE.PRODUCT}'`,
  })
  @WorkspaceIsNullable()
  itemSource: OrderItemSource | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.itemType,
    type: FieldMetadataType.SELECT,
    label: msg`Item Type`,
    description: msg`Type of order item (DIGITAL_EXTERNAL, INTERNAL_PRODUCT, INTERNAL_VARIANT, SERVICE, CUSTOM)`,
    icon: 'IconCategory',
    options: ORDER_ITEM_TYPE_OPTIONS,
    defaultValue: `'${ORDER_ITEM_TYPE.DIGITAL_EXTERNAL}'`,
  })
  @WorkspaceIsNullable()
  itemType: OrderItemType | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.sourceComboId,
    type: FieldMetadataType.UUID,
    label: msg`Source Combo ID`,
    description: msg`ID of combo this item belongs to (if from combo)`,
    icon: 'IconPackages',
  })
  @WorkspaceIsNullable()
  sourceComboId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.sourceComboItemId,
    type: FieldMetadataType.UUID,
    label: msg`Source Combo Item ID`,
    description: msg`ID of combo item this order item was created from`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  sourceComboItemId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.comboItemSnapshot,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Combo Item Snapshot`,
    description: msg`Immutable snapshot of combo item at order time`,
    icon: 'IconCamera',
  })
  @WorkspaceIsNullable()
  comboItemSnapshot: GenericComboItemSnapshot | null;

  // ============================================
  // INTERNAL PRODUCT/VARIANT FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.internalProductSnapshot,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Internal Product Snapshot`,
    description: msg`Immutable snapshot of internal CRM product at order time (for INTERNAL_PRODUCT type)`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  internalProductSnapshot: InternalProductSnapshot | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.internalVariantSnapshot,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Internal Variant Snapshot`,
    description: msg`Immutable snapshot of internal CRM variant at order time (for INTERNAL_VARIANT type)`,
    icon: 'IconBoxMultiple',
  })
  @WorkspaceIsNullable()
  internalVariantSnapshot: InternalVariantSnapshot | null;

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Order this item belongs to`,
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'orderItems',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktOrder: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string;

  @WorkspaceRelation({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activity`,
    description: msg`Timeline Activity that owns this order item`,
    icon: 'IconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktOrderItem',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity> | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_ORDER_ITEM,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;

  @WorkspaceRelation({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the order item`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktOrderItems',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceField({
    standardId: MKT_ORDER_ITEM_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
