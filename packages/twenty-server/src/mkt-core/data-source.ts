// packages/twenty-server/src/mkt-core/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { LicenseStatusHistory } from './libs/license/entities/license-status-history.entity';
import { License } from './libs/license/entities/license.entity';

export default new DataSource({
  type: 'postgres',
  url: 'postgres://postgres:postgres@localhost:5432/default',
  schema: 'core',
  entities: ['src/mkt-core/libs/**/*.entity.ts', License, LicenseStatusHistory],
  migrations: ['src/mkt-core/migration/*.ts'],
  logging: true,
});
