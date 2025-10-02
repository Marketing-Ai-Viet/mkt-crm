Dựa vào thiết kế database schema, đây là thứ tự chính xác để thêm dữ liệu vào 6 Core Entities:

Thứ tự thêm dữ liệu vào 6 Core Entities

Phase 1: Master Data (Không có dependencies)

1. MktPermissionResourceWorkspaceEntity

// Thêm trước tiên vì các entities khác reference đến nó
const resources = [
{ resourceKey: 'CUSTOMERS', resourceName: 'Customers', resourceCategory: 'BUSINESS_DATA' },
{ resourceKey: 'ORDERS', resourceName: 'Orders', resourceCategory: 'BUSINESS_DATA' },
{ resourceKey: 'PRODUCTS', resourceName: 'Products', resourceCategory: 'BUSINESS_DATA' },
{ resourceKey: 'REPORTS', resourceName: 'Reports', resourceCategory: 'REPORTING' },
{ resourceKey: 'SETTINGS', resourceName: 'Settings', resourceCategory: 'SYSTEM_CONFIG' },
{ resourceKey: 'USERS', resourceName: 'Users', resourceCategory: 'USER_MGMT' },
{ resourceKey: 'DEPARTMENTS', resourceName: 'Departments', resourceCategory: 'USER_MGMT' },
{ resourceKey: 'KPIS', resourceName: 'KPIs', resourceCategory: 'REPORTING' },
{ resourceKey: 'FINANCIAL_DATA', resourceName: 'Financial Data', resourceCategory: 'FINANCIAL' }
];

2. MktPermissionActionWorkspaceEntity

// Thêm sau resources, độc lập với templates
const actions = [
{ actionKey: 'READ', actionName: 'Read', actionCategory: 'BASIC_CRUD', riskLevel: 'LOW' },
{ actionKey: 'CREATE', actionName: 'Create', actionCategory: 'BASIC_CRUD', riskLevel: 'MEDIUM' },
{ actionKey: 'UPDATE', actionName: 'Update', actionCategory: 'BASIC_CRUD', riskLevel: 'MEDIUM' },
{ actionKey: 'DELETE', actionName: 'Delete', actionCategory: 'BASIC_CRUD', riskLevel: 'HIGH' },
{ actionKey: 'EXPORT', actionName: 'Export', actionCategory: 'ADVANCED', riskLevel: 'MEDIUM' },
{ actionKey: 'APPROVE', actionName: 'Approve', actionCategory: 'APPROVAL', riskLevel: 'HIGH' },
{ actionKey: 'CONFIGURE', actionName: 'Configure', actionCategory: 'SYSTEM', riskLevel: 'CRITICAL' }
];

Phase 2: Template Definition

3. MktPermissionTemplateWorkspaceEntity

// Thêm sau khi có master data, trước junction tables
const templates = [
{
templateKey: 'CEO',
templateName: 'Chief Executive Officer',
hierarchyLevel: 1,
applicableToLevels: [1],
priority: 800,
isSystemTemplate: true
},
{
templateKey: 'VICE_PRESIDENT',
templateName: 'Vice President',
hierarchyLevel: 2,
applicableToLevels: [2],
priority: 700,
isSystemTemplate: true
},
{
templateKey: 'DIRECTOR',
templateName: 'Director',
hierarchyLevel: 3,
applicableToLevels: [3],
priority: 600,
isSystemTemplate: true
},
{
templateKey: 'MANAGER',
templateName: 'Manager',
hierarchyLevel: 4,
applicableToLevels: [4],
priority: 500,
isSystemTemplate: true
},
{
templateKey: 'TEAM_LEAD',
templateName: 'Team Lead',
hierarchyLevel: 5,
applicableToLevels: [5],
priority: 400,
isSystemTemplate: true
},
{
templateKey: 'SENIOR_STAFF',
templateName: 'Senior Staff',
hierarchyLevel: 6,
applicableToLevels: [6],
priority: 300,
isSystemTemplate: true
},
{
templateKey: 'JUNIOR_STAFF',
templateName: 'Junior Staff',
hierarchyLevel: 7,
applicableToLevels: [7],
priority: 200,
isSystemTemplate: true
},
{
templateKey: 'INTERN',
templateName: 'Intern',
hierarchyLevel: 8,
applicableToLevels: [8],
priority: 100,
isSystemTemplate: true
}
];

Phase 3: Relationship Data (Có dependencies)

4. MktTemplateResourcePermissionWorkspaceEntity

// Thêm sau khi có Templates và Resources
// Cần templateId và resourceId từ bước 1,2,3
const resourcePermissions = [
// CEO - Full permissions cho tất cả resources
{
templateId: 'ceo-template-id',
resourceId: 'customers-resource-id',
allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
deniedActions: [],
conditions: {},
restrictions: {}
},
{
templateId: 'ceo-template-id',
resourceId: 'financial-data-resource-id',
allowedActions: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'],
deniedActions: [],
conditions: {},
restrictions: {}
},

    // INTERN - Restricted permissions
    {
      templateId: 'intern-template-id',
      resourceId: 'customers-resource-id',
      allowedActions: ['READ'],
      deniedActions: ['CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'],
      conditions: { supervisor_approval_required: true },
      restrictions: { max_records: 100 }
    }
    // ... more mappings for all template-resource combinations
];

5. MktTemplateSystemActionWorkspaceEntity

// Thêm sau Templates, định nghĩa system-level actions
const systemActions = [
// CEO - All system actions allowed
{ templateId: 'ceo-template-id', actionKey: 'DATA_EXPORT', isAllowed: true },
{ templateId: 'ceo-template-id', actionKey: 'BULK_OPERATIONS', isAllowed: true },
{ templateId: 'ceo-template-id', actionKey: 'ADMIN_FUNCTIONS', isAllowed: true },
{ templateId: 'ceo-template-id', actionKey: 'SYSTEM_CONFIGURATION', isAllowed: true },
{ templateId: 'ceo-template-id', actionKey: 'USER_MANAGEMENT', isAllowed: true },

    // INTERN - No system actions allowed
    { templateId: 'intern-template-id', actionKey: 'DATA_EXPORT', isAllowed: false },
    { templateId: 'intern-template-id', actionKey: 'BULK_OPERATIONS', isAllowed: false },
    { templateId: 'intern-template-id', actionKey: 'ADMIN_FUNCTIONS', isAllowed: false },
    { templateId: 'intern-template-id', actionKey: 'SYSTEM_CONFIGURATION', isAllowed: false },
    { templateId: 'intern-template-id', actionKey: 'USER_MANAGEMENT', isAllowed: false },

    // ... cho tất cả templates khác
];

6. MktTemplateAccessLimitationWorkspaceEntity

// Thêm cuối cùng, định nghĩa limitations cho từng template
const accessLimitations = [
// CEO - Minimal limitations
{
templateId: 'ceo-template-id',
limitationType: 'TEMPORAL',
limitationKey: 'session_timeout',
limitationValue: { timeout_seconds: 28800 }, // 8 hours
isEnforced: true,
severity: 'WARNING'
},
{
templateId: 'ceo-template-id',
limitationType: 'OPERATIONAL',
limitationKey: 'require_2fa',
limitationValue: { required: true },
isEnforced: true,
severity: 'BLOCKING'
},

    // INTERN - Strict limitations
    {
      templateId: 'intern-template-id',
      limitationType: 'TEMPORAL',
      limitationKey: 'working_hours',
      limitationValue: {
        enabled: true,
        start: '09:00',
        end: '17:00',
        weekdays_only: true
      },
      isEnforced: true,
      severity: 'BLOCKING'
    },
    {
      templateId: 'intern-template-id',
      limitationType: 'TEMPORAL',
      limitationKey: 'session_timeout',
      limitationValue: { timeout_seconds: 1800 }, // 30 minutes
      isEnforced: true,
      severity: 'BLOCKING'
    },
    {
      templateId: 'intern-template-id',
      limitationType: 'DATA_ACCESS',
      limitationKey: 'max_records_per_query',
      limitationValue: { max_records: 100 },
      isEnforced: true,
      severity: 'BLOCKING'
    },
    {
      templateId: 'intern-template-id',
      limitationType: 'OPERATIONAL',
      limitationKey: 'supervisor_oversight',
      limitationValue: { required: true, log_all_actions: true },
      isEnforced: true,
      severity: 'INFO'
    }

    // ... cho tất cả templates khác
];

Migration Script Implementation

export class PermissionTemplateMigrationService {
async seedAllPermissionData(workspaceId: string): Promise<void> {
try {
// Phase 1: Master Data
console.log('Phase 1: Seeding master data...');
const resources = await this.seedResources(workspaceId);
const actions = await this.seedActions(workspaceId);

        // Phase 2: Templates  
        console.log('Phase 2: Seeding templates...');
        const templates = await this.seedTemplates(workspaceId);

        // Phase 3: Relationships
        console.log('Phase 3: Seeding relationships...');
        await this.seedResourcePermissions(workspaceId, templates, resources);
        await this.seedSystemActions(workspaceId, templates);
        await this.seedAccessLimitations(workspaceId, templates);

        console.log('✅ Permission template seeding completed successfully');

      } catch (error) {
        console.error('❌ Permission template seeding failed:', error);
        throw error;
      }
    }

    private async seedResources(workspaceId: string): Promise<MktPermissionResource[]> {
      // Implementation for seeding resources
    }

    private async seedActions(workspaceId: string): Promise<MktPermissionAction[]> {
      // Implementation for seeding actions  
    }

    private async seedTemplates(workspaceId: string): Promise<MktPermissionTemplate[]> {
      // Implementation for seeding templates
    }

    private async seedResourcePermissions(
      workspaceId: string,
      templates: MktPermissionTemplate[],
      resources: MktPermissionResource[]
    ): Promise<void> {
      // Implementation for seeding resource permissions
    }

    private async seedSystemActions(
      workspaceId: string,
      templates: MktPermissionTemplate[]
    ): Promise<void> {
      // Implementation for seeding system actions
    }

    private async seedAccessLimitations(
      workspaceId: string,
      templates: MktPermissionTemplate[]
    ): Promise<void> {
      // Implementation for seeding access limitations
    }
}

Lý do thứ tự này:

1. Dependencies: Entities có foreign key phải đợi parent entities được tạo trước
2. Performance: Tạo master data trước để optimize lookups
3. Data Integrity: Đảm bảo referential integrity
4. Rollback: Dễ rollback theo thứ tự ngược lại
5. Testing: Có thể test từng phase riêng biệt

Thứ tự này đảm bảo migration process chạy smooth và có thể debug dễ dàng khi có issues.