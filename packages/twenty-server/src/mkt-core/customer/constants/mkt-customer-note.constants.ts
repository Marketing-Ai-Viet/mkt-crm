import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Customer note types for categorizing interactions
 */
export const MKT_CUSTOMER_NOTE_TYPE = {
  GENERAL: 'GENERAL',
  CALL: 'CALL',
  MEETING: 'MEETING',
  ISSUE: 'ISSUE',
  FOLLOWUP: 'FOLLOWUP',
  OTHER: 'OTHER',
} as const;

export type MktCustomerNoteType =
  (typeof MKT_CUSTOMER_NOTE_TYPE)[keyof typeof MKT_CUSTOMER_NOTE_TYPE];

export const MKT_CUSTOMER_NOTE_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CUSTOMER_NOTE_TYPE.GENERAL,
    label: 'Chung',
    color: 'gray',
    position: 0,
  },
  {
    value: MKT_CUSTOMER_NOTE_TYPE.CALL,
    label: 'Cuộc gọi',
    color: 'blue',
    position: 1,
  },
  {
    value: MKT_CUSTOMER_NOTE_TYPE.MEETING,
    label: 'Cuộc họp',
    color: 'green',
    position: 2,
  },
  {
    value: MKT_CUSTOMER_NOTE_TYPE.ISSUE,
    label: 'Vấn đề',
    color: 'red',
    position: 3,
  },
  {
    value: MKT_CUSTOMER_NOTE_TYPE.FOLLOWUP,
    label: 'Theo dõi',
    color: 'yellow',
    position: 4,
  },
  {
    value: MKT_CUSTOMER_NOTE_TYPE.OTHER,
    label: 'Khác',
    color: 'purple',
    position: 5,
  },
];

export const MKT_CUSTOMER_NOTE_TYPE_DEFAULT = `'${MKT_CUSTOMER_NOTE_TYPE.GENERAL}'`;

/**
 * Default pagination for customer notes
 */
export const CUSTOMER_NOTES_DEFAULT_LIMIT = 50;

/**
 * Log context for customer notes
 */
export const MKT_CUSTOMER_NOTE_LOG_CONTEXT = 'MktCustomerNote';

/**
 * Search fields for customer notes (used in tsVector)
 */
export const SEARCH_FIELDS_FOR_MKT_CUSTOMER_NOTE = ['content'];
