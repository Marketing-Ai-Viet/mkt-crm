import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * SELECT options for MktTemporaryPermission entity
 */

export const TEMPORARY_PERMISSION_PURPOSE_OPTIONS = [
  {
    value: 'EMERGENCY_ACCESS',
    label: 'Emergency Access',
    position: 1,
    color: 'red' as TagColor,
  },
  {
    value: 'CROSS_DEPARTMENT_COLLABORATION',
    label: 'Cross Department Collaboration',
    position: 2,
    color: 'blue' as TagColor,
  },
  {
    value: 'PROJECT_ASSIGNMENT',
    label: 'Project Assignment',
    position: 3,
    color: 'green' as TagColor,
  },
  {
    value: 'TEMPORARY_COVERAGE',
    label: 'Temporary Coverage',
    position: 4,
    color: 'yellow' as TagColor,
  },
  {
    value: 'TRAINING_ACCESS',
    label: 'Training Access',
    position: 5,
    color: 'purple' as TagColor,
  },
  {
    value: 'AUDIT_REVIEW',
    label: 'Audit Review',
    position: 6,
    color: 'orange' as TagColor,
  },
  {
    value: 'OTHER',
    label: 'Other',
    position: 7,
    color: 'gray' as TagColor,
  },
];

export const REVOKE_REASON_OPTIONS = [
  {
    value: 'EXPIRED',
    label: 'Expired',
    position: 1,
    color: 'gray' as TagColor,
  },
  {
    value: 'TASK_COMPLETED',
    label: 'Task Completed',
    position: 2,
    color: 'green' as TagColor,
  },
  {
    value: 'SECURITY_CONCERN',
    label: 'Security Concern',
    position: 3,
    color: 'red' as TagColor,
  },
  {
    value: 'ROLE_CHANGED',
    label: 'Role Changed',
    position: 4,
    color: 'blue' as TagColor,
  },
  {
    value: 'MANUAL_REVOCATION',
    label: 'Manual Revocation',
    position: 5,
    color: 'orange' as TagColor,
  },
  {
    value: 'POLICY_VIOLATION',
    label: 'Policy Violation',
    position: 6,
    color: 'red' as TagColor,
  },
  {
    value: 'OTHER',
    label: 'Other',
    position: 7,
    color: 'gray' as TagColor,
  },
];
