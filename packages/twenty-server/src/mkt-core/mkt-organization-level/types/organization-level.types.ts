/**
 * Organization Level Service Types
 */

/**
 * Điều kiện truy vấn organization level
 */
export type OrganizationLevelQueryConditions = {
  isActive?: boolean;
  hierarchyLevel?: number | number[];
  levelCodes?: string[];
  parentLevelId?: string;
};

/**
 * Metadata của node trong cây phân cấp
 */
export type HierarchyNodeMetadata = {
  totalEmployees: number;
  activeEmployees: number;
  directChildrenCount: number;
  totalDescendantsCount: number;
  depth: number;
  isLeaf: boolean;
  hasCircularReference: boolean;
};

/**
 * Tóm tắt permissions của organization level
 */
export type OrganizationLevelPermissionSummary = {
  resourceCount: number;
  actionCount: number;
  restrictionCount: number;
  temporalLimitations: boolean;
  dataAccessLimitations: boolean;
  operationalLimitations: boolean;
  functionalLimitations: boolean;
};

/**
 * Analytics của organization level
 */
export type OrganizationLevelAnalytics = {
  levelId: string;
  levelName: string;
  hierarchyLevel: number;
  employeeMetrics: {
    total: number;
    active: number;
    averageTenure: number;
    turnoverRate: number;
  };
  performanceMetrics: {
    averageKpiScore?: number;
    completedGoals: number;
    overdueTasks: number;
  };
  hierarchyMetrics: {
    directReports: number;
    totalReports: number;
    managementSpan: number;
    organizationalDepth: number;
  };
};

/**
 * Kích thước tổ chức
 */
export type OrganizationSize = 'small' | 'medium' | 'large' | 'enterprise';

/**
 * Mức độ nghiêm trọng của validation
 */
export type HierarchyValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Đề xuất tối ưu hóa cấu trúc phân cấp
 */
export type HierarchyOptimizationSuggestion = {
  type: 'restructure' | 'merge' | 'split' | 'rebalance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  affectedLevels: string[];
  expectedBenefit: string;
  implementationComplexity: 'easy' | 'medium' | 'complex';
};
