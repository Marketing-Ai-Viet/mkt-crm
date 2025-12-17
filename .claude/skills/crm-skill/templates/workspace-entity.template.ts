/**
 * WorkspaceEntity Template
 *
 * TODO:
 * 1. Replace 'YourEntity' with your entity name (PascalCase)
 * 2. Replace 'yourEntity' with your entity name (camelCase)
 * 3. Add Object ID to mkt-core/constants/mkt-object-ids.ts
 * 4. Add Field IDs to mkt-core/constants/mkt-field-ids.ts
 * 5. Run: npx nx run twenty-server:command workspace:sync-metadata -f
 */

import {
  WorkspaceEntity,
  WorkspaceField,
  WorkspaceRelation,
} from 'src/engine/twenty-orm/decorators';
import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { RelationMetadataType } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.entity';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';

// TODO: Import related entities if needed
// import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/mkt-customer.workspace-entity';

@WorkspaceEntity({
  // TODO: Add this ID to mkt-object-ids.ts first
  standardId: MKT_OBJECT_IDS.mktYourEntity,
  namePlural: 'mktYourEntities',
  labelSingular: 'Your Entity',
  labelPlural: 'Your Entities',
  description: 'Description of your entity',
  icon: 'IconBox',
})
export class MktYourEntityWorkspaceEntity extends BaseWorkspaceEntity {
  /**
   * TEXT Field Example
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.name,
    type: FieldMetadataType.TEXT,
    label: 'Name',
    description: 'Entity name',
    icon: 'IconTextCaption',
  })
  name: string;

  /**
   * SELECT Field Example (Enum-like)
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.status,
    type: FieldMetadataType.SELECT,
    label: 'Status',
    description: 'Entity status',
    icon: 'IconStatusChange',
    options: [
      { value: 'ACTIVE', label: 'Active', color: 'green', position: 0 },
      { value: 'INACTIVE', label: 'Inactive', color: 'gray', position: 1 },
      { value: 'PENDING', label: 'Pending', color: 'yellow', position: 2 },
    ],
    defaultValue: "'ACTIVE'",
  })
  status: string;

  /**
   * NUMBER Field Example
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.amount,
    type: FieldMetadataType.NUMBER,
    label: 'Amount',
    description: 'Amount value',
    icon: 'IconCurrencyDollar',
  })
  amount: number;

  /**
   * BOOLEAN Field Example
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Active',
    description: 'Whether entity is active',
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  /**
   * DATE_TIME Field Example
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.processedAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Processed At',
    description: 'When entity was processed',
    icon: 'IconCalendar',
  })
  processedAt: Date;

  /**
   * RICH_TEXT Field Example (Long text)
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.description,
    type: FieldMetadataType.RICH_TEXT,
    label: 'Description',
    description: 'Detailed description',
    icon: 'IconNotes',
  })
  description: string;

  /**
   * UUID Field Example (Foreign Key without relation)
   */
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktYourEntity.externalId,
    type: FieldMetadataType.UUID,
    label: 'External ID',
    description: 'External system reference',
    icon: 'IconLink',
  })
  externalId: string;

  /**
   * MANY_TO_ONE Relation Example
   * TODO: Uncomment and configure
   */
  // @WorkspaceRelation({
  //   standardId: MKT_FIELD_IDS.mktYourEntity.customer,
  //   type: RelationMetadataType.MANY_TO_ONE,
  //   label: 'Customer',
  //   description: 'Related customer',
  //   icon: 'IconUser',
  //   inverseSideTarget: () => MktCustomerWorkspaceEntity,
  //   inverseSideFieldKey: 'yourEntities',
  // })
  // customer: MktCustomerWorkspaceEntity;

  /**
   * ONE_TO_MANY Relation Example (Inverse Side)
   * TODO: Uncomment and configure
   */
  // @WorkspaceRelation({
  //   standardId: MKT_FIELD_IDS.mktYourEntity.items,
  //   type: RelationMetadataType.ONE_TO_MANY,
  //   label: 'Items',
  //   description: 'Related items',
  //   icon: 'IconList',
  //   inverseSideTarget: () => MktYourEntityItemWorkspaceEntity,
  //   inverseSideFieldKey: 'yourEntity',
  // })
  // items: MktYourEntityItemWorkspaceEntity[];
}
