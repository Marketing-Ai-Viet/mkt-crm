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
import { MKT_I18N_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const TABLE_NAME = 'mktI18N';
const NAME_FIELD_NAME = 'name';
const LOCALE_FIELD_NAME = 'locale';
const KEY_FIELD_NAME = 'key';

export const SEARCH_FIELDS_FOR_MKT_I18N: FieldTypeAndNameMetadata[] = [
  { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: LOCALE_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: KEY_FIELD_NAME, type: FieldMetadataType.TEXT },
];

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktI18n,
  namePlural: `${TABLE_NAME}s`,
  labelSingular: msg`I18n`,
  labelPlural: msg`I18n`,
  description: msg`Assign i18n`,
  icon: 'IconTag',
  labelIdentifierStandardId: MKT_I18N_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktI18nWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Key`,
    description: msg`I18n key`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.mktFieldId,
    type: FieldMetadataType.TEXT,
    label: msg`Field ID`,
    description: msg`Associated field ID`,
    icon: 'IconHash',
  })
  @WorkspaceIsNullable()
  mktFieldId?: string;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.key,
    type: FieldMetadataType.TEXT,
    label: msg`Key`,
    description: msg`I18n key`,
    icon: 'IconTag',
  })
  key: string;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.locale,
    type: FieldMetadataType.TEXT,
    label: msg`Locale`,
    description: msg`I18n locale`,
    icon: 'IconGlobe',
  })
  locale?: string;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.data,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Data`,
    description: msg`I18n data in JSON format`,
    icon: 'IconFileCode',
  })
  data?: JSON;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.description,
    type: FieldMetadataType.TEXT,
    label: msg`Description`,
    description: msg`Attribute description`,
    icon: 'IconFileDescription',
  })
  description: string;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in the list`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position?: number;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;

  @WorkspaceRelation({
    standardId: MKT_I18N_FIELD_IDS.accountOwner,
    type: RelationType.MANY_TO_ONE,
    label: msg`Account Owner`,
    description: msg`Your team member responsible for managing the i18n`,
    icon: 'IconUserCircle',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'accountOwnerForMktI18ns',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('accountOwner')
  accountOwnerId: string | null;

  @WorkspaceRelation({
    standardId: MKT_I18N_FIELD_IDS.timelineActivities,
    type: RelationType.ONE_TO_MANY,
    label: msg`Timeline Activities`,
    description: msg`Timeline Activities linked to the i18n`,
    icon: 'IconIconTimelineEvent',
    inverseSideTarget: () => TimelineActivityWorkspaceEntity,
    inverseSideFieldKey: 'mktI18n',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;

  @WorkspaceField({
    standardId: MKT_I18N_FIELD_IDS.searchVector,
    type: FieldMetadataType.TS_VECTOR,
    label: SEARCH_VECTOR_FIELD.label,
    description: SEARCH_VECTOR_FIELD.description,
    icon: 'IconUser',
    generatedType: 'STORED',
    asExpression: getTsVectorColumnExpressionFromFields(
      SEARCH_FIELDS_FOR_MKT_I18N,
    ),
  })
  @WorkspaceIsNullable()
  @WorkspaceIsSystem()
  @WorkspaceFieldIndex({ indexType: IndexType.GIN })
  searchVector: string;
}
