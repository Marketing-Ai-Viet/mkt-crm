/**
 * User Permission Template Types
 *
 * Types for user template assignment operations
 */

/**
 * Input for assigning a template to a user
 */
export type AssignTemplateInput = {
  workspaceMemberId: string;
  templateId: string;
  assignedById?: string;
  expiresAt?: Date;
  assignmentReason?: string;
};

/**
 * Input for bulk assignment
 */
export type BulkAssignTemplateInput = {
  workspaceMemberIds: string[];
  templateId: string;
  assignedById?: string;
  expiresAt?: Date;
  assignmentReason?: string;
};

/**
 * Input for updating an assignment
 */
export type UpdateAssignmentInput = {
  expiresAt?: Date | null;
  assignmentReason?: string;
  isActive?: boolean;
};

/**
 * Assignment summary for a user
 */
export type UserAssignmentSummary = {
  workspaceMemberId: string;
  assignments: Array<{
    id: string;
    templateId: string;
    templateKey: string;
    templateName: string;
    hierarchyLevel?: number;
    assignedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
    isExpired: boolean;
  }>;
  activeCount: number;
  expiredCount: number;
};

/**
 * Template usage statistics
 */
export type TemplateUsageStats = {
  templateId: string;
  templateKey: string;
  totalAssignments: number;
  activeAssignments: number;
  expiredAssignments: number;
};
