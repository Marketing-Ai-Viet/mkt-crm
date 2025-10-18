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
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { WorkspaceIsSystem } from 'src/engine/twenty-orm/decorators/workspace-is-system.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import {
  FieldTypeAndNameMetadata,
  getTsVectorColumnExpressionFromFields,
} from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';
import { MKT_LICENSE_HISTORY_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const TABLE_LICENSE_NAME = 'mktLicenseHistory';
const NAME_FIELD_NAME = 'name';
const ACTION_FIELD_NAME = 'action';
const NOTE_FIELD_NAME = 'note';

export const SEARCH_FIELDS_FOR_MKT_LICENSE_HISTORY: FieldTypeAndNameMetadata[] =
  [
    { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
    { name: ACTION_FIELD_NAME, type: FieldMetadataType.TEXT },
    { name: NOTE_FIELD_NAME, type: FieldMetadataType.TEXT },
  ];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicenseHistory,
  namePlural: `${TABLE_LICENSE_NAME}s`,
  labelSingular: msg`License History`,
  labelPlural: msg`Licenses Histories`,
  description: msg`License History entity for catalog`,
  icon: 'IconHistory',
  labelIdentifierStandardId: MKT_LICENSE_HISTORY_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktLicenseHistoryWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`License History Name`,
    description: msg`License history name`,
    icon: 'IconFileText',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.action,
    type: FieldMetadataType.TEXT,
    label: msg`License Action`,
    description: msg`License action `,
    icon: 'IconHistory',
  })
  @WorkspaceIsNullable()
  action: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.note,
    type: FieldMetadataType.TEXT,
    label: msg`Notes`,
    description: msg`License History notes`,
    icon: 'IconNotes',
  })
  @WorkspaceIsNullable()
  note?: string;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Metadata`,
    description: msg`Additional metadata for the license history`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  metadata?: JSON | null;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position: number;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.mktLicense,
    type: RelationType.MANY_TO_ONE,
    label: msg`License`,
    description: msg`The license associated with this history record`,
    icon: 'IconLicense',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'mktLicenseHistories',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  mktLicense: Relation<MktLicenseWorkspaceEntity>;

  @WorkspaceJoinColumn('mktLicense')
  mktLicenseId: string;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the license history`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktLicenseHistories',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the license history`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktLicenseHistory',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_LICENSE_HISTORY_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_MKT_LICENSE_HISTORY,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
