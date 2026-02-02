import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Match Type Constants for Workspace Entity SELECT field
 */
export const MATCH_TYPE_ENTITY = {
  VA: 'VA',
  EXACT_CODE: 'EXACT_CODE',
  FUZZY: 'FUZZY',
  MANUAL: 'MANUAL',
} as const;

export type MatchTypeEntity =
  (typeof MATCH_TYPE_ENTITY)[keyof typeof MATCH_TYPE_ENTITY];

export const MATCH_TYPE_OPTIONS = [
  {
    value: MATCH_TYPE_ENTITY.VA,
    label: 'Virtual Account',
    position: 0,
    color: 'green' as TagColor,
  },
  {
    value: MATCH_TYPE_ENTITY.EXACT_CODE,
    label: 'Exact Code Match',
    position: 1,
    color: 'blue' as TagColor,
  },
  {
    value: MATCH_TYPE_ENTITY.FUZZY,
    label: 'Fuzzy Match',
    position: 2,
    color: 'yellow' as TagColor,
  },
  {
    value: MATCH_TYPE_ENTITY.MANUAL,
    label: 'Manual Match',
    position: 3,
    color: 'gray' as TagColor,
  },
];
