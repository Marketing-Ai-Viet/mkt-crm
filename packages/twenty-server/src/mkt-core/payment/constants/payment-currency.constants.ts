import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export const PAYMENT_CURRENCY_OPTIONS = [
  {
    value: 'VND',
    label: 'VND',
    position: 0,
    color: 'green' as TagColor,
  },
  {
    value: 'USD',
    label: 'USD',
    position: 1,
    color: 'blue' as TagColor,
  },
  {
    value: 'EUR',
    label: 'EUR',
    position: 2,
    color: 'purple' as TagColor,
  },
  {
    value: 'JPY',
    label: 'JPY',
    position: 3,
    color: 'red' as TagColor,
  },
  {
    value: 'CNY',
    label: 'CNY',
    position: 4,
    color: 'orange' as TagColor,
  },
  {
    value: 'KRW',
    label: 'KRW',
    position: 5,
    color: 'sky' as TagColor,
  },
];

export const DEFAULT_PAYMENT_CURRENCY = 'VND' as const;
