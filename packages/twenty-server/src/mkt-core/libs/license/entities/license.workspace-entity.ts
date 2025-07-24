import { msg } from '@lingui/core/macro';
import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import { LICENSE_STANDARD_FIELD_IDS } from 'src/mkt-core/common/constants/custom-field-ids';
import { CUSTOM_OBJECT_IDS } from 'src/mkt-core/common/constants/custom-object-ids';
import { FieldMetadataType } from 'twenty-shared/types';
import { LicenseStatusHistoryWorkspaceEntity } from './license-status-history.workspace-entity';
export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}
@WorkspaceEntity({
  standardId: CUSTOM_OBJECT_IDS.license,
  namePlural: 'licenses',
  labelSingular: msg`License`,
  labelPlural: msg`Licenses`,
  description: msg`Represents a software license issued to a customer.`,
  icon: 'IconKey',
  shortcut: 'L',
  labelIdentifierStandardId: LICENSE_STANDARD_FIELD_IDS.licenseCode,
})
export class LicenseWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.licenseCode,
    type: FieldMetadataType.TEXT,
    label: msg`License Code`,
  })
  licenseCode: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.orderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Order Code`,
  })
  orderCode: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.productName,
    type: FieldMetadataType.TEXT,
    label: msg`Product Name`,
  })
  productName: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.customerEmail,
    type: FieldMetadataType.TEXT,
    label: msg`Customer Email`,
  })
  customerEmail: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.customerName,
    type: FieldMetadataType.TEXT,
    label: msg`Customer Name`,
  })
  customerName: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.customerContact,
    type: FieldMetadataType.TEXT,
    label: msg`Customer Contact`,
  })
  @WorkspaceIsNullable()
  customerContact?: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Current license status`,
    options: [
      {
        value: LicenseStatus.ACTIVE,
        label: `Active`,
        position: 0,
        color: 'green',
      },
      {
        value: LicenseStatus.INACTIVE,
        label: `Inactive`,
        position: 1,
        color: 'red',
      },
      {
        value: LicenseStatus.SUSPENDED,
        label: `Suspended`,
        position: 2,
        color: 'yellow',
      },
    ],
  })
  status: LicenseStatus;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.type,
    type: FieldMetadataType.TEXT,
    label: msg`Type`,
    description: msg`View type`,
    defaultValue: "'table'",
  })
  type: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.activatedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Activated At`,
  })
  activatedAt: Date;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.expiredAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Expired At`,
  })
  expiredAt: Date;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.saleInCharge,
    type: FieldMetadataType.TEXT,
    label: msg`Sale In Charge`,
  })
  saleInCharge: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.supportInCharge,
    type: FieldMetadataType.TEXT,
    label: msg`Support In Charge`,
  })
  supportInCharge: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.assignedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Assigned At`,
  })
  assignedAt: Date;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.lastLoginAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Last Login At`,
  })
  @WorkspaceIsNullable()
  lastLoginAt?: Date;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.currentVersion,
    type: FieldMetadataType.TEXT,
    label: msg`Current Version`,
  })
  @WorkspaceIsNullable()
  currentVersion?: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.deviceInfo,
    type: FieldMetadataType.TEXT,
    label: msg`Device Info`,
  })
  @WorkspaceIsNullable()
  deviceInfo?: string;

  @WorkspaceField({
    standardId: LICENSE_STANDARD_FIELD_IDS.internalNote,
    type: FieldMetadataType.TEXT,
    label: msg`Internal Note`,
  })
  @WorkspaceIsNullable()
  internalNote?: string;

  @WorkspaceRelation({
    standardId: LICENSE_STANDARD_FIELD_IDS.statusHistories, // <- thêm ID này vào constant nếu chưa có
    type: RelationType.ONE_TO_MANY,
    label: msg`Status Histories`,
    description: msg`List of all status history records related to this license`,
    icon: 'IconTimeline',
    inverseSideTarget: () => LicenseStatusHistoryWorkspaceEntity,
    inverseSideFieldKey: 'license',
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  statusHistories: Relation<LicenseStatusHistoryWorkspaceEntity[]>;
}
