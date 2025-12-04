// License Status Constants
export const LICENSE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type LicenseStatusType =
  (typeof LICENSE_STATUS)[keyof typeof LICENSE_STATUS];

// Type Guard
export const isLicenseStatus = (value: string): value is LicenseStatusType =>
  Object.values(LICENSE_STATUS).includes(value as LicenseStatusType);

// License Type Constants
export const LICENSE_TYPE = {
  PERPETUAL: 'perpetual',
  SUBSCRIPTION: 'subscription',
  TRIAL: 'trial',
} as const;

export type LicenseTypeValue = (typeof LICENSE_TYPE)[keyof typeof LICENSE_TYPE];

// Actor Types
export type ActorType = 'user' | 'system';

export type ActorContext = {
  name?: string;
  email?: string;
  source?: string;
  timestamp?: string;
};

export type CreatedByActor = {
  type: ActorType;
  userId?: string;
  actorId: string;
  context?: ActorContext;
};

export type UpdatedByActor = {
  type: ActorType;
  actorId: string;
  context?: ActorContext;
};

// Localized Text Type
export type LocalizedText = {
  en?: string;
  ko?: string;
  vi?: string;
};

// License Metadata Types
export type LicenseSourceConfig = {
  price?: number;
  configId?: string;
  appliedAt?: string;
  productId?: string;
  licenseType?: LicenseTypeValue;
  productName?: string | null;
  durationDays?: number | null;
  productDescription?: string | null;
};

export type LicenseMetadata = {
  sourceConfig?: LicenseSourceConfig;
} & Record<string, unknown>;

// Product Metadata Type
export type ProductMetadata = {
  tags?: string[];
  color?: string;
  category?: string;
  features?: string[];
  deployment?: string;
  targetAudience?: string;
} & Record<string, unknown>;

// Product Response Type
export type ProductResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: CreatedByActor | null;
  updatedBy: UpdatedByActor | null;
  productName: LocalizedText;
  productDescription: LocalizedText;
  productOverview: LocalizedText;
  code: string;
  status: string;
  version: string;
  entityVersion: number;
  basePrice: number;
  iconUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  sortOrder: number;
  metadata: ProductMetadata;
  name: string | null;
  description: string | null;
};

// License Response Type
export type LicenseResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: CreatedByActor | null;
  updatedBy: UpdatedByActor | null;
  version: number;
  licenseKey: string;
  type: LicenseTypeValue;
  originalType: LicenseTypeValue;
  status: LicenseStatusType;
  startDate: string | null;
  endDate: string | null;
  maxDevices: number;
  metadata: LicenseMetadata;
  userId: string;
  productId: string;
  product?: ProductResponse;
};

// Paginated Response Type
export type PaginatedLicenseResponse = {
  data: LicenseResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// License Validation Result Type
export type LicenseValidationResult = {
  isValid: boolean;
  reason?: string;
  license?: LicenseResponse;
};

// Analytics Group By Constants
export const ANALYTICS_GROUP_BY = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type AnalyticsGroupByType =
  (typeof ANALYTICS_GROUP_BY)[keyof typeof ANALYTICS_GROUP_BY];

// License Analytics Type
export type LicenseAnalytics = {
  total: number;
  byStatus: Record<string, number>;
  queryPeriod?: {
    startDate: string;
    endDate: string;
  };
};

// API Response Wrapper Types
export type LicenseApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type LicenseApiErrorResponse = {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
};
