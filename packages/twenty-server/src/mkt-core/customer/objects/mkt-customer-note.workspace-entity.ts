import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { Relation } from 'typeorm';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/relation-metadata/relation-on-delete-action.type';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_CUSTOMER_NOTE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  MKT_CUSTOMER_NOTE_TYPE_DEFAULT,
  MKT_CUSTOMER_NOTE_TYPE_OPTIONS,
  MktCustomerNoteType,
} from 'src/mkt-core/customer/constants/mkt-customer-note.constants';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

/**
 * Entity name for mktCustomerNote - used in GraphQL operations and hooks
 * Format: 'mkt{EntityName}' (camelCase)
 */
export const MKT_CUSTOMER_NOTE_ENTITY_NAME = 'mktCustomerNote';

/**
 * MktCustomerNoteWorkspaceEntity
 *
 * Custom entity for customer notes with note types
 * - Supports categorization: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP
 * - Rich text content
 * - Linked to customer with cascade delete
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomerNote,
  namePlural: 'mktCustomerNotes',
  labelSingular: msg`Customer Note`,
  labelPlural: msg`Customer Notes`,
  description: msg`Notes and interaction records for customers`,
  icon: 'IconNote',
})
@WorkspaceIsSearchable()
export class MktCustomerNoteWorkspaceEntity extends BaseWorkspaceEntity {
  // ============ CONTENT ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_NOTE_FIELD_IDS.content,
    type: FieldMetadataType.RICH_TEXT,
    label: msg`Content`,
    description: msg`Nội dung ghi chú`,
    icon: 'IconFileText',
  })
  content: string;

  // ============ CATEGORIZATION ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_NOTE_FIELD_IDS.noteType,
    type: FieldMetadataType.SELECT,
    label: msg`Note Type`,
    description: msg`Loại ghi chú`,
    icon: 'IconCategory',
    options: MKT_CUSTOMER_NOTE_TYPE_OPTIONS,
    defaultValue: MKT_CUSTOMER_NOTE_TYPE_DEFAULT,
  })
  @WorkspaceIsNullable()
  noteType: MktCustomerNoteType;

  // ============ COMMON FIELDS ============

  @WorkspaceField({
    standardId: MKT_CUSTOMER_NOTE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Vị trí trong danh sách`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_CUSTOMER_NOTE_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`Người tạo ghi chú`,
  })
  createdBy: ActorMetadata;

  // ============ RELATIONS ============

  @WorkspaceRelation({
    standardId: MKT_CUSTOMER_NOTE_FIELD_IDS.customer,
    type: RelationType.MANY_TO_ONE,
    label: msg`Customer`,
    description: msg`Khách hàng liên quan`,
    icon: 'IconUser',
    inverseSideTarget: () => MktCustomerWorkspaceEntity,
    inverseSideFieldKey: 'customerNotes',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  customer: Relation<MktCustomerWorkspaceEntity> | null;

  @WorkspaceJoinColumn('customer')
  customerId: string | null;
}
