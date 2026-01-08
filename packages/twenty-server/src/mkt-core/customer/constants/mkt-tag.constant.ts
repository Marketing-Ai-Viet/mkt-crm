import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum MKT_TAGS {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export enum MKT_TAG_TYPE {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export const MKT_TAG_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_TAG_TYPE.SYSTEM,
    label: 'System',
    color: 'gray',
    position: 1,
  },
  {
    value: MKT_TAG_TYPE.CUSTOM,
    label: 'Custom',
    color: 'green',
    position: 2,
  },
];
