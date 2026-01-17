/**
 * Audit and Logging Types for Enterprise RBAC
 * Contains all audit-related type definitions
 */

/**
 * Compliance violation type
 */
export type ComplianceViolation = {
  id: string;
  violationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK';
  affectedUsers: string[];
  affectedResources: string[];
  recommendedActions: string[];
  businessImpact: string;
  technicalDetails: Record<string, string | number | boolean>;
};

/**
 * Security incident type
 */
export type SecurityIncident = {
  id: string;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  assignedTo?: string;
  affectedSystems: string[];
  rootCause?: string;
  remediationSteps: string[];
  relatedAlertIds: string[];
  evidenceUrls: string[];
  timeline: {
    timestamp: Date;
    event: string;
    actor: string;
  }[];
};

/**
 * Alert summary type
 */
export type AlertSummary = {
  id: string;
  alertType: string;
  count: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  firstOccurrence: Date;
  lastOccurrence: Date;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  affectedEntities: string[];
};

/**
 * Audit log entry type
 */
export type AuditLogEntry = {
  id?: string;
  eventType: string;
  eventCategory: 'PERMISSION' | 'SECURITY' | 'COMPLIANCE' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Context information
  userId: string;
  workspaceId: string;
  workspaceMemberId: string;
  sessionId?: string;
  requestId?: string;

  // Action details
  action: string;
  resource: string;
  resourceId?: string;

  // Result information
  result: 'GRANTED' | 'DENIED' | 'ERROR' | 'WARNING';
  reason?: string;
  riskScore?: number;

  // Additional details
  details: Record<string, string | number | boolean | Date>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    executionTime?: number;
    validationSteps?: string[];
  };

  // Compliance and legal
  complianceFrameworks?: string[];
  retentionPeriod?: number; // days
  sensitiveData?: boolean;
  personalData?: boolean;

  // Status
  processed: boolean;
  alertGenerated?: boolean;
  escalated?: boolean;

  createdAt: Date;
  updatedAt?: Date;
};

/**
 * Security alert type
 */
export type SecurityAlert = {
  id?: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Alert details
  title: string;
  description: string;
  recommendation?: string;

  // Related entities
  userId: string;
  workspaceId: string;
  relatedLogIds: string[];

  // Status
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  // Metadata
  metadata: Record<string, string | number | boolean | Date>;
  createdAt: Date;
  updatedAt?: Date;
};

/**
 * Compliance report type
 */
export type ComplianceReport = {
  id?: string;
  framework: string;
  reportType: 'PERIODIC' | 'ON_DEMAND' | 'INCIDENT';
  period: { from: Date; to: Date };

  // Summary statistics
  totalPermissionChecks: number;
  totalDenials: number;
  totalErrors: number;
  totalSensitiveDataAccess: number;

  // Violations and incidents
  violations: ComplianceViolation[];
  incidents: SecurityIncident[];
  alerts: AlertSummary[];

  // Compliance status
  complianceScore: number;
  recommendations: string[];

  generatedAt: Date;
  generatedBy: string;
};

/**
 * Audit configuration type
 */
export type AuditConfiguration = {
  // Enable/disable audit features
  enableAuditLogging: boolean;
  enableSecurityAlerts: boolean;
  enableComplianceReporting: boolean;

  // Retention policies
  defaultRetentionDays: number;
  sensitiveDataRetentionDays: number;
  financialDataRetentionDays: number;

  // Alert thresholds
  suspiciousActivityThreshold: number;
  highRiskScoreThreshold: number;
  criticalEventThreshold: number;

  // Performance settings
  maxAuditBatchSize: number;
  auditProcessingIntervalMs: number;
  alertProcessingIntervalMs: number;

  // Storage settings
  maxAuditLogSize: number;
  maxSecurityAlertSize: number;
  enableCompression: boolean;

  // Compliance frameworks
  activeComplianceFrameworks: string[];
  complianceReportingSchedule: string[];
};

/**
 * Audit metrics type
 */
export type AuditMetrics = {
  // Time period
  periodStart: Date;
  periodEnd: Date;

  // General metrics
  totalAuditEntries: number;
  totalSecurityAlerts: number;
  totalComplianceReports: number;

  // Performance metrics
  averageAuditProcessingTime: number;
  maxAuditProcessingTime: number;
  auditProcessingErrors: number;

  // Security metrics
  highRiskEvents: number;
  criticalEvents: number;
  falsePositiveRate: number;

  // Compliance metrics
  complianceViolations: number;
  complianceScore: number;
  frameworkCoverage: number;

  // Storage metrics
  totalStorageUsed: number;
  averageEntrySize: number;
  compressionRatio?: number;
};

/**
 * Audit filter type
 */
export type AuditFilter = {
  // Time filters
  startDate?: Date;
  endDate?: Date;

  // Entity filters
  userId?: string;
  workspaceId?: string;
  resourceType?: string;
  actionType?: string;

  // Category filters
  eventCategories?: ('PERMISSION' | 'SECURITY' | 'COMPLIANCE' | 'SYSTEM')[];
  severityLevels?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  resultTypes?: ('GRANTED' | 'DENIED' | 'ERROR' | 'WARNING')[];

  // Content filters
  searchText?: string;
  tags?: string[];

  // Advanced filters
  riskScoreMin?: number;
  riskScoreMax?: number;
  complianceFrameworks?: string[];
  sensitiveDataOnly?: boolean;

  // Pagination
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

/**
 * Audit search result type
 */
export type AuditSearchResult = {
  // Results
  entries: AuditLogEntry[];
  alerts: SecurityAlert[];
  reports: ComplianceReport[];

  // Pagination info
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;

  // Search metadata
  searchDuration: number;
  appliedFilters: AuditFilter;
  searchId: string;
};

/**
 * Audit export request type
 */
export type AuditExportRequest = {
  // Export configuration
  format: 'JSON' | 'CSV' | 'PDF' | 'XML';
  includeEntries: boolean;
  includeAlerts: boolean;
  includeReports: boolean;

  // Filters
  filters: AuditFilter;

  // Export options
  compression: boolean;
  encryption: boolean;
  password?: string;

  // Metadata
  requestedBy: string;
  requestedAt: Date;
  description?: string;
};

/**
 * Audit export result type
 */
export type AuditExportResult = {
  // Export info
  exportId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  format: string;

  // File info
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;

  // Statistics
  totalEntries: number;
  processingTime?: number;
  error?: string;

  // Metadata
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
};

/**
 * Audit retention policy type
 */
export type AuditRetentionPolicy = {
  id: string;
  name: string;
  description?: string;

  // Policy rules
  dataTypes: string[];
  retentionDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;

  // Conditions
  conditions: {
    severityLevels?: string[];
    complianceFrameworks?: string[];
    resourceTypes?: string[];
  };

  // Status
  isActive: boolean;
  lastExecuted?: Date;
  nextExecution?: Date;

  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
};

/**
 * Audit notification type
 */
export type AuditNotification = {
  id: string;
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';

  // Trigger conditions
  triggerEvents: string[];
  severityThreshold: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Recipients
  recipients: string[];

  // Configuration
  template?: string;
  customMessage?: string;
  includeDetails: boolean;

  // Status
  isActive: boolean;
  lastSent?: Date;

  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
};
