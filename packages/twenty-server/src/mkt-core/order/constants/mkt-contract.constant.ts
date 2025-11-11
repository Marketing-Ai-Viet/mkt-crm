import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum MKT_CONTRACT_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export const MKT_CONTRACT_STATUS_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CONTRACT_STATUS.ACTIVE,
    label: 'Active',
    position: 0,
    color: 'blue',
  },
  {
    value: MKT_CONTRACT_STATUS.INACTIVE,
    label: 'Inactive',
    position: 1,
    color: 'purple',
  },
  {
    value: MKT_CONTRACT_STATUS.EXPIRED,
    label: 'Expired',
    position: 2,
    color: 'green',
  },
  {
    value: MKT_CONTRACT_STATUS.REVOKED,
    label: 'Revoked',
    position: 3,
    color: 'orange',
  },
];
