import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum MEMBER_TYPE {
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  LEADER = 'LEADER',
  ADMIN = 'ADMIN',
}

export const MEMBER_TYPE_OPTIONS = [
  {
    value: MEMBER_TYPE.SALES,
    label: 'Sales',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: MEMBER_TYPE.SUPPORT,
    label: 'Support',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: MEMBER_TYPE.LEADER,
    label: 'Leader',
    color: 'orange' as TagColor,
    position: 2,
  },
  {
    value: MEMBER_TYPE.ADMIN,
    label: 'Admin',
    color: 'red' as TagColor,
    position: 3,
  },
];
