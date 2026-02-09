import { registerEnumType } from '@nestjs/graphql';

export enum DashboardPeriod {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

registerEnumType(DashboardPeriod, {
  name: 'DashboardPeriod',
  description: 'Dashboard time period filter',
});
