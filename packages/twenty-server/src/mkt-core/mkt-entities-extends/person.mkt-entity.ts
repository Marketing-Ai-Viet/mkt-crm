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
    standardId: MKT_PERSON_FIELD_IDS.newEmail,
    type: FieldMetadataType.TEXT,
    label: msg`New Email`,
    description: msg`The new email address of the workspace member`,
    icon: 'IconMailForward',
  })
  @WorkspaceIsNullable()
  newEmail: string | null;

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

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.supportForMemberId,
    type: FieldMetadataType.TEXT,
    label: msg`Support For Member ID`,
    description: msg`The member ID that this workspace member provides support for`,
    icon: 'IconLifebuoy',
  })
  @WorkspaceIsNullable()
  supportForMemberId: string;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.startDate,
    type: FieldMetadataType.DATE,
    label: msg`Start Date`,
    description: msg`The start date of the workspace member's employment`,
    icon: 'IconCalendarStart',
  })
  @WorkspaceIsNullable()
  startDate: Date | null;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.endDate,
    type: FieldMetadataType.DATE,
    label: msg`End Date`,
    description: msg`The end date of the workspace member's employment`,
    icon: 'IconCalendarEnd',
  })
  @WorkspaceIsNullable()
  endDate: Date | null;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.status,
    type: FieldMetadataType.TEXT,
    label: msg`Status`,
    description: msg`The current status of the workspace member`,
    icon: 'IconInfoCircle',
  })
  @WorkspaceIsNullable()
  status: string | null;

  @WorkspaceField({
    standardId: MKT_PERSON_FIELD_IDS.syncStatus,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Sync Status`,
    description: msg`Person sync status`,
    icon: 'IconSync',
    defaultValue: true,
  })
  @WorkspaceIsNullable()
  syncStatus: boolean;
}
