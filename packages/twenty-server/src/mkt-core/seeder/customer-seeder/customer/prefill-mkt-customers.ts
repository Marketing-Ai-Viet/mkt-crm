import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  MKT_CUSTOMER_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/customer/mkt-customer-data-seeds.constants';

export const prefillMktCustomers = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktCustomer`, MKT_CUSTOMER_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_CUSTOMER_DATA_SEEDS)
    .execute();
};

/**
 * Update supportOwnerId cho customers sau khi workspace members đã được seed
 * Chạy sau prefillMktCustomers để tránh circular dependency
 */
export const updateCustomerSupportOwners = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Mapping customer -> supportOwner
  const supportOwnerMappings = [
    {
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
      supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Tech lead hỗ trợ VIP
    },
    {
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
      supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Sales Manager
    },
    {
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
      supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Admin Manager
    },
    {
      customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
      supportOwnerId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE, // Support staff
    },
    // CHURNED_CUSTOMER không có supportOwner (đã ngưng sử dụng)
  ];

  for (const mapping of supportOwnerMappings) {
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .update(`${schemaName}.mktCustomer`)
      .set({ supportOwnerId: mapping.supportOwnerId })
      .where('id = :id', { id: mapping.customerId })
      .execute();
  }
};
