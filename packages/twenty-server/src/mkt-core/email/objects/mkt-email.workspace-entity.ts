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
import { MKT_EMAIL_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const TABLE_NAME = 'mktEmail';

export const SEARCH_FIELDS: FieldTypeAndNameMetadata[] = [
  { name: 'subject', type: FieldMetadataType.TEXT },
  { name: 'body', type: FieldMetadataType.TEXT },
  { name: 'to', type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktEmail,
  namePlural: `${TABLE_NAME}s`,
  labelSingular: msg`Email`,
  labelPlural: msg`Emails`,
  description: msg`Assign emails to your workspace`,
  icon: 'IconMail',
  labelIdentifierStandardId: MKT_EMAIL_FIELD_IDS.subject,
})
@WorkspaceIsSearchable()
export class MktEmailWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.subject,
    type: FieldMetadataType.TEXT,
    label: msg`Subject`,
    description: msg`Email subject`,
    icon: 'IconTag',
  })
  subject: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.to,
    type: FieldMetadataType.TEXT,
    label: msg`To`,
    description: msg`Email recipient`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  to: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.from,
    type: FieldMetadataType.TEXT,
    label: msg`From`,
    description: msg`Email sender`,
    icon: 'IconUser',
  })
  @WorkspaceIsNullable()
  from: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.body,
    type: FieldMetadataType.TEXT,
    label: msg`Body`,
    description: msg`Email body content`,
    icon: 'IconType',
  })
  @WorkspaceIsNullable()
  body: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.sentAt,
    type: FieldMetadataType.DATE,
    label: msg`Sent At`,
    description: msg`The date and time the email was sent`,
    icon: 'IconCalendarTime',
  })
  @WorkspaceIsNullable()
  sentAt: Date;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`Email status`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  status: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.emailType,
    type: FieldMetadataType.TEXT,
    label: msg`Email Type`,
    description: msg`Type of the email`,
    icon: 'IconMail',
  })
  @WorkspaceIsNullable()
  emailType: string;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in the list`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  @WorkspaceIsNullable()
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_EMAIL_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Owner send the email`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktEmails',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_EMAIL_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the email`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktEmail',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_EMAIL_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(SEARCH_FIELDS),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
