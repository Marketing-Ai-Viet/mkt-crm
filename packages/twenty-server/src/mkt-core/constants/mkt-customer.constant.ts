import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum MKT_CUSTOMER_TYPE {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  ORGANIZATION = 'organization',
  OTHER = 'other',
}

export enum MKT_CUSTOMER_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PROSPECTIVE = 'prospective',
  OTHER = 'other',
}

export enum MKT_CUSTOMER_TIER {
  INDIVIDUAL = 'individual',
  SMALL = 'small',
  MEDIUM = 'medium',
  ENTERPRISE = 'enterprise',
  OTHER = 'other',
}

export enum MKT_CUSTOMER_LIFECYCLE_STAGE {
  PROSPECTIVE = 'prospective',
  TRIAL = 'trial',
  CUSTOMER = 'customer',
  LOYAL = 'loyal',
  CHURNED = 'churned',
  RETENTION = 'retention',
  UPSELL = 'upsell',
  CROSS_SELL = 'cross_sell',
  REACTIVATION = 'reactivation',
  OTHER = 'other',
}

export enum MKT_CUSTOMER_TAGS {
  NEW = 'new',
  RETURNING = 'returning',
  LOYAL = 'loyal',
  VIP = 'vip',
  CHURNED = 'churned',
  RETENTION = 'retention',
  TECHNICAL = 'technical',
  OTHER = 'other',
}

export const MKT_CUSTOMER_TYPE_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: MKT_CUSTOMER_TYPE.INDIVIDUAL,
    label: 'Individual',
    color: 'blue',
    position: 1,
  },
  {
    value: MKT_CUSTOMER_TYPE.BUSINESS,
    label: 'Business',
    color: 'green',
    position: 2,
  },
  {
    value: MKT_CUSTOMER_TYPE.ORGANIZATION,
    label: 'Organization',
    color: 'red',
    position: 3,
  },
  {
    value: MKT_CUSTOMER_TYPE.OTHER,
    label: 'Other',
    color: 'gray',
    position: 4,
  },
];
