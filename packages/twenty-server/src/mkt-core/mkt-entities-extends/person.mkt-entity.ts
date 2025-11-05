import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WORKSPACE_MEMBER_MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import {
  MEMBER_TYPE,
  MEMBER_TYPE_OPTIONS,
} from 'src/mkt-core/mkt-entities-extends/mkt-member.constant';

export class PersonMktEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: WORKSPACE_MEMBER_MKT_FIELD_IDS.memberType,
    type: FieldMetadataType.SELECT,
    label: msg`Member Type`,
    description: msg`The type of the workspace member in the marketing module`,
    icon: 'IconUserCheck',
    options: MEMBER_TYPE_OPTIONS,
  })
  @WorkspaceIsNullable()
  memberType: MEMBER_TYPE | null;
}
