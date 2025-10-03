import {
  SOURCE_TYPE,
  SOURCE_SUBTYPE,
  PRIORITY_FORMULA,
} from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

type MktPermissionPriorityConfigDataSeed = {
  id: string;
  sourceType: SOURCE_TYPE;
  sourceSubType?: SOURCE_SUBTYPE;
  basePriority: number;
  priorityBoost?: number;
  maxPriority?: number;
  minPriority?: number;
  priorityFormula?: string;
  conditions?: object;
  isActive: boolean;
  description: string;
  position?: number;
};

export const MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEED_COLUMNS: (keyof MktPermissionPriorityConfigDataSeed)[] =
  [
    'id',
    'sourceType',
    'sourceSubType',
    'basePriority',
    'priorityBoost',
    'maxPriority',
    'minPriority',
    'priorityFormula',
    'conditions',
    'isActive',
    'description',
    'position',
  ];

/**
 * Priority Config IDs - Valid UUIDs for consistent references
 */
export const PRIORITY_CONFIG_IDS = {
  // OVERRIDE IDs
  OVERRIDE_EMERGENCY: 'a1b2c3d4-e5f6-4a4b-8c8d-111111111111',
  OVERRIDE_COMPLIANCE: 'a1b2c3d4-e5f6-4a4b-8c8d-222222222222',
  OVERRIDE_AUDIT: 'a1b2c3d4-e5f6-4a4b-8c8d-333333333333',
  OVERRIDE_TEMPORARY_GRANT: 'a1b2c3d4-e5f6-4a4b-8c8d-444444444444',
  OVERRIDE_TEMPORARY_DENY: 'a1b2c3d4-e5f6-4a4b-8c8d-555555555555',
  OVERRIDE_BUSINESS_EXCEPTION: 'a1b2c3d4-e5f6-4a4b-8c8d-666666666666',

  // TEMPLATE IDs
  TEMPLATE_ROLE_BASED: 'b2c3d4e5-f6a7-4b5c-9d0e-111111111111',
  TEMPLATE_HIERARCHY_BASED: 'b2c3d4e5-f6a7-4b5c-9d0e-222222222222',
  TEMPLATE_DEPARTMENT_BASED: 'b2c3d4e5-f6a7-4b5c-9d0e-333333333333',
  TEMPLATE_SYSTEM_DEFAULT: 'b2c3d4e5-f6a7-4b5c-9d0e-444444444444',

  // POLICY IDs
  POLICY_HIERARCHY_FILTER: 'c3d4e5f6-a7b8-4c6d-0e1f-111111111111',
  POLICY_DEPARTMENT_FILTER: 'c3d4e5f6-a7b8-4c6d-0e1f-222222222222',
  POLICY_CUSTOM_FILTER: 'c3d4e5f6-a7b8-4c6d-0e1f-333333333333',
};

/**
 * Priority Configuration Data Seeds
 * Defines dynamic priority resolution for RBAC system
 *
 * Priority Hierarchy:
 * - OVERRIDE (1500-15000): Highest - User-specific exceptions
 * - TEMPLATE (500-1000): Medium - Role/Hierarchy permissions
 * - POLICY (10-100): Lowest - Data access filtering
 */
export const MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEEDS: MktPermissionPriorityConfigDataSeed[] =
  [
    // ==================== OVERRIDE PRIORITIES (Highest) ====================

    // Emergency Access - Highest Priority
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_EMERGENCY,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.EMERGENCY,
      basePriority: 15000,
      priorityBoost: 0,
      maxPriority: 20000,
      minPriority: 15000,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { reason: 'EMERGENCY_ACCESS' },
      isActive: true,
      description:
        'Ghi đè quyền truy cập khẩn cấp - ưu tiên cao nhất cho các tình huống nguy kịch cần truy cập ngay lập tức',
      position: 100,
    },

    // Compliance/Legal Overrides
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_COMPLIANCE,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.COMPLIANCE,
      basePriority: 10000,
      priorityBoost: 0,
      maxPriority: 12000,
      minPriority: 10000,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { reason: ['COMPLIANCE_REQUIREMENT', 'AUDIT_REQUIREMENT'] },
      isActive: true,
      description:
        'Ghi đè tuân thủ và pháp lý - hạn chế truy cập bắt buộc theo yêu cầu quy định',
      position: 200,
    },

    // Audit-Related Overrides
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_AUDIT,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.AUDIT,
      basePriority: 8000,
      priorityBoost: 0,
      maxPriority: 9000,
      minPriority: 8000,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { reason: 'AUDIT_REQUIREMENT' },
      isActive: true,
      description:
        'Ghi đè liên quan kiểm toán - hạn chế tạm thời trong quá trình điều tra kiểm toán',
      position: 300,
    },

    // Temporary Grant Overrides
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_TEMPORARY_GRANT,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.TEMPORARY_GRANT,
      basePriority: 5000,
      priorityBoost: 0,
      maxPriority: 6000,
      minPriority: 5000,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { isAllowed: true },
      isActive: true,
      description:
        'Cấp quyền tạm thời - mở rộng quyền truy cập theo dự án hoặc giới hạn thời gian',
      position: 400,
    },

    // Temporary Deny Overrides
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_TEMPORARY_DENY,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.TEMPORARY_DENY,
      basePriority: 3000,
      priorityBoost: 0,
      maxPriority: 4000,
      minPriority: 3000,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { isAllowed: false },
      isActive: true,
      description:
        'Thu hồi quyền tạm thời - thu hồi trong quá trình điều tra hoặc bảo trì',
      position: 500,
    },

    // Business Exception Overrides
    {
      id: PRIORITY_CONFIG_IDS.OVERRIDE_BUSINESS_EXCEPTION,
      sourceType: SOURCE_TYPE.OVERRIDE,
      sourceSubType: SOURCE_SUBTYPE.BUSINESS_EXCEPTION,
      basePriority: 1500,
      priorityBoost: 0,
      maxPriority: 2000,
      minPriority: 1500,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { reason: 'BUSINESS_EXCEPTION' },
      isActive: true,
      description:
        'Ghi đè ngoại lệ nghiệp vụ - quyền trường hợp đặc biệt cho các tình huống kinh doanh độc nhất',
      position: 600,
    },

    // ==================== TEMPLATE PRIORITIES (Medium) ====================

    // Role-Based Templates
    {
      id: PRIORITY_CONFIG_IDS.TEMPLATE_ROLE_BASED,
      sourceType: SOURCE_TYPE.TEMPLATE,
      sourceSubType: SOURCE_SUBTYPE.ROLE_BASED,
      basePriority: 1000,
      priorityBoost: 0,
      maxPriority: 1200,
      minPriority: 900,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { isSystemTemplate: true },
      isActive: true,
      description:
        'Mẫu quyền theo vai trò - định nghĩa vai trò chuẩn (ADMIN, MANAGER, v.v.)',
      position: 700,
    },

    // Hierarchy-Based Templates
    {
      id: PRIORITY_CONFIG_IDS.TEMPLATE_HIERARCHY_BASED,
      sourceType: SOURCE_TYPE.TEMPLATE,
      sourceSubType: SOURCE_SUBTYPE.HIERARCHY_BASED,
      basePriority: 800,
      priorityBoost: 100,
      maxPriority: 1000,
      minPriority: 700,
      priorityFormula: PRIORITY_FORMULA.HIERARCHY_BOOST,
      conditions: { hierarchyLevel: { $gte: 1, $lte: 10 } },
      isActive: true,
      description:
        'Mẫu quyền theo cấp bậc - quyền theo cấp độ tổ chức (CEO=1, Nhân viên=10)',
      position: 800,
    },

    // Department-Based Templates
    {
      id: PRIORITY_CONFIG_IDS.TEMPLATE_DEPARTMENT_BASED,
      sourceType: SOURCE_TYPE.TEMPLATE,
      sourceSubType: SOURCE_SUBTYPE.DEPARTMENT_BASED,
      basePriority: 600,
      priorityBoost: 0,
      maxPriority: 700,
      minPriority: 600,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { departmentId: { $exists: true } },
      isActive: true,
      description:
        'Mẫu quyền theo phòng ban - bộ quyền đặc thù cho từng phòng ban',
      position: 900,
    },

    // System Default Templates
    {
      id: PRIORITY_CONFIG_IDS.TEMPLATE_SYSTEM_DEFAULT,
      sourceType: SOURCE_TYPE.TEMPLATE,
      sourceSubType: SOURCE_SUBTYPE.SYSTEM_DEFAULT,
      basePriority: 500,
      priorityBoost: 0,
      maxPriority: 600,
      minPriority: 500,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { isSystemTemplate: true, isDefaultTemplate: true },
      isActive: true,
      description:
        'Mẫu quyền mặc định hệ thống - quyền dự phòng cho tất cả người dùng',
      position: 1000,
    },

    // ==================== POLICY PRIORITIES (Lowest) ====================

    // Hierarchy-Based Data Filters
    {
      id: PRIORITY_CONFIG_IDS.POLICY_HIERARCHY_FILTER,
      sourceType: SOURCE_TYPE.POLICY,
      sourceSubType: SOURCE_SUBTYPE.HIERARCHY_FILTER,
      basePriority: 100,
      priorityBoost: 10,
      maxPriority: 150,
      minPriority: 50,
      priorityFormula: PRIORITY_FORMULA.HIERARCHY_FILTER_BOOST,
      conditions: { minHierarchyLevel: { $exists: true } },
      isActive: true,
      description:
        'Chính sách truy cập dữ liệu theo cấp bậc - lọc dữ liệu theo cấp độ tổ chức',
      position: 1100,
    },

    // Department-Based Data Filters
    {
      id: PRIORITY_CONFIG_IDS.POLICY_DEPARTMENT_FILTER,
      sourceType: SOURCE_TYPE.POLICY,
      sourceSubType: SOURCE_SUBTYPE.DEPARTMENT_FILTER,
      basePriority: 80,
      priorityBoost: 0,
      maxPriority: 100,
      minPriority: 70,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { departmentId: { $exists: true } },
      isActive: true,
      description:
        'Chính sách truy cập dữ liệu theo phòng ban - lọc dữ liệu theo thành viên phòng ban',
      position: 1200,
    },

    // Custom Data Filters
    {
      id: PRIORITY_CONFIG_IDS.POLICY_CUSTOM_FILTER,
      sourceType: SOURCE_TYPE.POLICY,
      sourceSubType: SOURCE_SUBTYPE.CUSTOM_FILTER,
      basePriority: 50,
      priorityBoost: 0,
      maxPriority: 70,
      minPriority: 50,
      priorityFormula: PRIORITY_FORMULA.BASE_PRIORITY,
      conditions: { filterRules: { $exists: true } },
      isActive: true,
      description:
        'Chính sách truy cập dữ liệu tùy chỉnh - quy tắc và điều kiện lọc do người dùng định nghĩa',
      position: 1300,
    },
  ];

/**
 * Priority Configuration Summary
 *
 * OVERRIDE (Highest Priority - Always Wins)
 * ├── EMERGENCY (15000)        - Critical access needs
 * ├── COMPLIANCE (10000)       - Legal/regulatory requirements
 * ├── AUDIT (8000)             - Investigation restrictions
 * ├── TEMPORARY_GRANT (5000)   - Project-based grants
 * ├── TEMPORARY_DENY (3000)    - Temporary revocations
 * └── BUSINESS_EXCEPTION (1500) - Special business cases
 *
 * TEMPLATE (Medium Priority - Standard Permissions)
 * ├── ROLE_BASED (1000)        - Role definitions
 * ├── HIERARCHY_BASED (800)    - Org level permissions
 * ├── DEPARTMENT_BASED (600)   - Department permissions
 * └── SYSTEM_DEFAULT (500)     - Fallback permissions
 *
 * POLICY (Lowest Priority - Data Filtering Only)
 * ├── HIERARCHY_FILTER (100)   - Level-based data access
 * ├── DEPARTMENT_FILTER (80)   - Dept-based data access
 * └── CUSTOM_FILTER (50)       - Custom filtering rules
 *
 * Resolution Strategy:
 * 1. Sort all sources by priority (DESC)
 * 2. PRIORITY_BASED: Use permissions from highest priority source
 * 3. Policies apply AFTER permission resolution (data filtering)
 */
