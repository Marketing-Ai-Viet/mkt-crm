// packages/twenty-server/src/mkt-core/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { LicenseStatusHistory } from './libs/license/entities/license-status-history.entity';
import { License } from './libs/license/entities/license.entity';

export default new DataSource({
  type: 'postgres',
  url: 'postgres://postgres:73633a3f4566dd08b86dceedb7b9765df34e890178a4686f9dc10a31605e91d7@5.161.211.205:56932/default',
  schema: 'core',
  entities: ['packages/twenty-server/src/mkt-core/libs/**/*.entity.ts', License, LicenseStatusHistory],
  migrations: ['packages/twenty-server/src/mkt-core/migration/*.ts'],
  logging: true,
});
