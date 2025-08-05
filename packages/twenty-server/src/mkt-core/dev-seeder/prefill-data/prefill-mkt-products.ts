import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

export const PREMIUM_CRM_SOFTWARE_ID = 'c776ee49-f608-4a77-8cc8-6fe96ae1e43f';
export const MARKETING_AUTOMATION_TOOL_ID = 'f45ee421-8a3e-4aa5-a1cf-7207cc6754e1';
export const ANALYTICS_DASHBOARD_ID = '1f70157c-4ea5-4d81-bc49-e1401abfbb94';
export const LEAD_GENERATION_SERVICE_ID = '9d5bcf43-7d38-4e88-82cb-d6d4ce638bf0';
export const CUSTOMER_SUPPORT_PLATFORM_ID = '06290608-8bf0-4806-99ae-a715a6a93fad';

export const prefillMktProducts = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.product`, [
      'id',
      'name',
      'description',
      'price',
      'category',
      'sku',
      'inStock',
      'position',
      
      'createdBySource',
      'createdByWorkspaceMemberId',
      'createdByName',
    ])
    .orIgnore()
    .values([
      {
        id: PREMIUM_CRM_SOFTWARE_ID,
        name: 'Premium CRM Software',
        description: 'Enterprise-level customer relationship management solution',
        price: 299.99,
        category: 'Software',
        sku: 'CRM-PREM-001',
        inStock: true,
        position: 1,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: MARKETING_AUTOMATION_TOOL_ID,
        name: 'Marketing Automation Tool',
        description: 'Advanced marketing automation platform for businesses',
        price: 199.99,
        category: 'Marketing',
        sku: 'MKT-AUTO-002',
        inStock: true,
        position: 2,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: ANALYTICS_DASHBOARD_ID,
        name: 'Analytics Dashboard',
        description: 'Comprehensive business analytics and reporting dashboard',
        price: 149.99,
        category: 'Analytics',
        sku: 'ANAL-DASH-003',
        inStock: false,
        position: 3,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: LEAD_GENERATION_SERVICE_ID,
        name: 'Lead Generation Service',
        description: 'Professional lead generation and qualification service',
        price: 399.99,
        category: 'Service',
        sku: 'LEAD-GEN-004',
        inStock: true,
        position: 4,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
      {
        id: CUSTOMER_SUPPORT_PLATFORM_ID,
        name: 'Customer Support Platform',
        description: 'Integrated customer support and ticketing system',
        price: 249.99,
        category: 'Support',
        sku: 'SUPP-PLAT-005',
        inStock: true,
        position: 5,
        createdBySource: FieldActorSource.SYSTEM,
        createdByWorkspaceMemberId: null,
        createdByName: 'System',
      },
    ])
    .returning('*')
    .execute();
};
