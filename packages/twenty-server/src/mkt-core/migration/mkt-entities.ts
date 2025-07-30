import { MktCustomerWorkspaceEntity } from 'src/mkt-core/libs/customers/entities/customer.workspace-entity';
import { LicenseStatusHistoryWorkspaceEntity } from '../libs/license/entities/license-status-history.workspace-entity';
import { LicenseWorkspaceEntity } from '../libs/license/entities/license.workspace-entity';
import { PRODUCT_ENTITIES } from 'src/mkt-core/libs/products';

export const MKT_ENTITIES = [
  MktCustomerWorkspaceEntity,
  LicenseWorkspaceEntity,
  LicenseStatusHistoryWorkspaceEntity,
  ...PRODUCT_ENTITIES
];
