import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';
import { PermissionSource } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Permission Source Options for Select Fields
 * Centralized management for consistent usage across entities
 */
export const PERMISSION_SOURCE_OPTIONS: Array<{
  value: PermissionSource;
  label: string;
  position: number;
  color: TagColor;
}> = [
  {
    value: PermissionSource.ROLE,
    label: 'Role',
    position: 0,
    color: 'blue',
  },
  {
    value: PermissionSource.USER,
    label: 'User',
    position: 1,
    color: 'green',
  },
  {
    value: PermissionSource.WORKSPACE,
    label: 'Workspace',
    position: 2,
    color: 'purple',
  },
  {
    value: PermissionSource.SYSTEM,
    label: 'System',
    position: 3,
    color: 'gray',
  },
  {
    value: PermissionSource.PERMISSION_TEMPLATE,
    label: 'Permission Template',
    position: 4,
    color: 'yellow',
  },
  {
    value: PermissionSource.HIERARCHY_INHERITANCE,
    label: 'Hierarchy Inheritance',
    position: 5,
    color: 'orange',
  },
  {
    value: PermissionSource.DEPARTMENT_POLICY,
    label: 'Department Policy',
    position: 6,
    color: 'red',
  },
  {
    value: PermissionSource.SPECIAL_OVERRIDE,
    label: 'Special Override',
    position: 7,
    color: 'pink',
  },
  {
    value: PermissionSource.DYNAMIC_CONDITION,
    label: 'Dynamic Condition',
    position: 8,
    color: 'turquoise',
  },
  {
    value: PermissionSource.EMERGENCY_ACCESS,
    label: 'Emergency Access',
    position: 9,
    color: 'red',
  },
  {
    value: PermissionSource.TEMPORARY_ELEVATION,
    label: 'Temporary Elevation',
    position: 10,
    color: 'sky',
  },
];

/**
 * Permission Action Options for Select Fields
 * Centralized management for consistent usage across entities
 */
export const PERMISSION_ACTION_OPTIONS: Array<{
  value: string;
  label: string;
  position: number;
  color: TagColor;
}> = [
  {
    value: 'READ',
    label: 'Read',
    position: 0,
    color: 'blue',
  },
  {
    value: 'CREATE',
    label: 'Create',
    position: 1,
    color: 'green',
  },
  {
    value: 'UPDATE',
    label: 'Update',
    position: 2,
    color: 'yellow',
  },
  {
    value: 'DELETE',
    label: 'Delete',
    position: 3,
    color: 'red',
  },
  {
    value: 'EXPORT',
    label: 'Export',
    position: 4,
    color: 'purple',
  },
  {
    value: 'IMPORT',
    label: 'Import',
    position: 5,
    color: 'blue',
  },
  {
    value: 'SHARE',
    label: 'Share',
    position: 6,
    color: 'turquoise',
  },
  {
    value: 'PUBLISH',
    label: 'Publish',
    position: 7,
    color: 'sky',
  },
  {
    value: 'ARCHIVE',
    label: 'Archive',
    position: 8,
    color: 'gray',
  },
  {
    value: 'RESTORE',
    label: 'Restore',
    position: 9,
    color: 'green',
  },
  {
    value: 'APPROVE',
    label: 'Approve',
    position: 10,
    color: 'green',
  },
  {
    value: 'REJECT',
    label: 'Reject',
    position: 11,
    color: 'red',
  },
  {
    value: 'ESCALATE',
    label: 'Escalate',
    position: 12,
    color: 'orange',
  },
  {
    value: 'CONFIGURE',
    label: 'Configure',
    position: 13,
    color: 'purple',
  },
  {
    value: 'MONITOR',
    label: 'Monitor',
    position: 14,
    color: 'blue',
  },
  {
    value: 'AUDIT',
    label: 'Audit',
    position: 15,
    color: 'pink',
  },
  {
    value: 'MANAGE',
    label: 'Manage',
    position: 16,
    color: 'orange',
  },
];

/**
 * Check Result Options for Select Fields
 * Centralized management for consistent usage across entities
 */
export const CHECK_RESULT_OPTIONS: Array<{
  value: string;
  label: string;
  position: number;
  color: TagColor;
}> = [
  {
    value: 'PASS',
    label: 'Pass',
    position: 0,
    color: 'green',
  },
  {
    value: 'FAIL',
    label: 'Fail',
    position: 1,
    color: 'red',
  },
  {
    value: 'SKIP',
    label: 'Skip',
    position: 2,
    color: 'gray',
  },
  {
    value: 'WARNING',
    label: 'Warning',
    position: 3,
    color: 'yellow',
  },
  {
    value: 'ERROR',
    label: 'Error',
    position: 4,
    color: 'red',
  },
];
