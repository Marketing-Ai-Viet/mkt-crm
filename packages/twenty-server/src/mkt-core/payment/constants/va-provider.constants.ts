import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Virtual Account Provider Types
 */
export const VA_PROVIDER_TYPE = {
  SEPAY: 'SEPAY',
  BIDV: 'BIDV',
} as const;

export type VAProviderType =
  (typeof VA_PROVIDER_TYPE)[keyof typeof VA_PROVIDER_TYPE];

export const VA_PROVIDER_OPTIONS = [
  {
    value: VA_PROVIDER_TYPE.SEPAY,
    label: 'SEPay',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: VA_PROVIDER_TYPE.BIDV,
    label: 'BIDV',
    position: 1,
    color: 'green' as TagColor,
  },
];
