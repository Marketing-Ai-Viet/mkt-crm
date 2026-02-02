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
import { MKT_VIRTUAL_ACCOUNT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  VA_PROVIDER_OPTIONS,
  VAProviderType,
} from 'src/mkt-core/payment/constants/va-provider.constants';

const SEARCH_FIELDS_FOR_VA: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
  { name: 'vaNumber', type: FieldMetadataType.TEXT },
  { name: 'accountName', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktVirtualAccount,
  namePlural: 'mktVirtualAccounts',
  labelSingular: msg`Virtual Account`,
  labelPlural: msg`Virtual Accounts`,
  description: msg`Virtual Account for payment matching`,
  icon: 'IconCreditCard',
  labelIdentifierStandardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.name,
})
export class MktVirtualAccountWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Virtual account name or reference`,
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.vaNumber,
    type: FieldMetadataType.TEXT,
    label: msg`VA Number`,
    description: msg`Virtual account number from provider`,
    icon: 'IconHash',
  })
  @WorkspaceFieldIndex()
  vaNumber: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.bankCode,
    type: FieldMetadataType.TEXT,
    label: msg`Bank Code`,
    description: msg`Bank code (e.g., BIDV, VCB)`,
    icon: 'IconBuilding',
  })
  @WorkspaceIsNullable()
  bankCode?: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.bankName,
    type: FieldMetadataType.TEXT,
    label: msg`Bank Name`,
    description: msg`Full bank name`,
    icon: 'IconBuildingBank',
  })
  @WorkspaceIsNullable()
  bankName?: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.accountName,
    type: FieldMetadataType.TEXT,
    label: msg`Account Name`,
    description: msg`Account holder name`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  accountName?: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.amount,
    type: FieldMetadataType.NUMBER,
    label: msg`Amount`,
    description: msg`Expected payment amount`,
    icon: 'IconCash',
    defaultValue: 0,
  })
  amount: number;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.qrCodeUrl,
    type: FieldMetadataType.TEXT,
    label: msg`QR Code URL`,
    description: msg`QR code image URL for payment`,
    icon: 'IconQrcode',
  })
  @WorkspaceIsNullable()
  qrCodeUrl?: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expires At`,
    description: msg`VA expiration date and time`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  expiresAt?: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether the VA is currently active`,
    icon: 'IconToggleRight',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.provider,
    type: FieldMetadataType.SELECT,
    label: msg`Provider`,
    description: msg`VA provider (e.g., SEPay, BIDV)`,
    icon: 'IconBuildingBank',
    options: VA_PROVIDER_OPTIONS,
  })
  @WorkspaceIsNullable()
  provider?: VAProviderType;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.providerResponse,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Provider Response`,
    description: msg`Raw response from VA provider`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  providerResponse: JSON | null;

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.mktOrder,
    type: RelationType.MANY_TO_ONE,
    label: msg`Order`,
    description: msg`Order linked to this VA`,
    icon: 'IconBox',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'mktVirtualAccounts',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktOrder: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('mktOrder')
  mktOrderId: string;

  @WorkspaceRelation({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.mktPayments,
    type: RelationType.ONE_TO_MANY,
    label: msg`Payments`,
    description: msg`Payments made via this VA`,
    icon: 'IconCash',
    inverseSideTarget: () => MktPaymentWorkspaceEntity,
    inverseSideFieldKey: 'virtualAccount',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  mktPayments: Relation<MktPaymentWorkspaceEntity[]>;

  // ============================================
  // COMMON FIELDS
  // ============================================

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  // Note: TimelineActivities relation removed - requires extending TimelineActivityWorkspaceEntity
  // Can be added in future when timeline support for VA is needed

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconSearch',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS_FOR_VA),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;

  @WorkspaceField({
    standardId: MKT_VIRTUAL_ACCOUNT_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
