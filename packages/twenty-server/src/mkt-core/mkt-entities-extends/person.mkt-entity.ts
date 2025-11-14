import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { MKT_PERSON_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';

export class PersonMktEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.memberType,
    type: FieldMetadataType.TEXT,
    label: msg`Member Type`,
    description: msg`The type of the workspace member in the marketing module`,
    icon: 'IconUserCheck',
  })
  @WorkspaceIsNullable()
  memberType: string;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.departmentId,
    type: FieldMetadataType.TEXT,
    label: msg`Department ID`,
    description: msg`The ID of the department the person belongs to`,
    icon: 'IconBuildingCommunity',
  })
  @WorkspaceIsNullable()
  departmentId: string;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.teamId,
    type: FieldMetadataType.TEXT,
    label: msg`Team ID`,
    description: msg`The ID of the team the person belongs to`,
    icon: 'IconUsers',
  })
  @WorkspaceIsNullable()
  teamId: string;
}
