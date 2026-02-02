import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Transfer Type Constants for Workspace Entity SELECT field
 */
export const TRANSFER_TYPE_ENTITY = {
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  REGULAR: 'REGULAR',
} as const;

export type TransferTypeEntity =
  (typeof TRANSFER_TYPE_ENTITY)[keyof typeof TRANSFER_TYPE_ENTITY];

export const TRANSFER_TYPE_OPTIONS = [
  {
    value: TRANSFER_TYPE_ENTITY.REGULAR,
    label: 'Regular Transfer',
    position: 0,
    color: 'gray' as TagColor,
  },
  {
    value: TRANSFER_TYPE_ENTITY.VIRTUAL_ACCOUNT,
    label: 'Virtual Account',
    position: 1,
    color: 'blue' as TagColor,
  },
];
