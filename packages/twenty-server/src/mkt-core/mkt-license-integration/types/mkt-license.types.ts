// ============================================
// LICENSE STATUS
// ============================================

export const MKT_LICENSE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type MktLicenseStatusType =
  (typeof MKT_LICENSE_STATUS)[keyof typeof MKT_LICENSE_STATUS];

export const isMktLicenseStatus = (
  value: string,
): value is MktLicenseStatusType =>
  Object.values(MKT_LICENSE_STATUS).includes(value as MktLicenseStatusType);

// ============================================
// LICENSE TYPE
// ============================================

export const MKT_LICENSE_TYPE = {
  PERPETUAL: 'perpetual',
  SUBSCRIPTION: 'subscription',
  TRIAL: 'trial',
} as const;

export type MktLicenseTypeValue =
  (typeof MKT_LICENSE_TYPE)[keyof typeof MKT_LICENSE_TYPE];

// ============================================
// ACTOR TYPES
// ============================================

export type MktActorType = 'user' | 'system';

export type MktActorContext = {
  name?: string;
  email?: string;
  source?: string;
  timestamp?: string;
};

export type MktCreatedByActor = {
  type: MktActorType;
  userId?: string;
  actorId: string;
  context?: MktActorContext;
};

export type MktUpdatedByActor = {
  type: MktActorType;
  actorId: string;
  context?: MktActorContext;
};

// ============================================
// LOCALIZED TEXT
// ============================================

export type MktLocalizedText = {
  en?: string;
  ko?: string;
  vi?: string;
};

// ============================================
// LICENSE METADATA
// ============================================

export type MktLicenseSourceConfig = {
  price?: number;
  configId?: string;
  appliedAt?: string;
  productId?: string;
  licenseType?: MktLicenseTypeValue;
  productName?: string | null;
  durationDays?: number | null;
  productDescription?: string | null;
};

export type MktLicenseMetadata = {
  sourceConfig?: MktLicenseSourceConfig;
} & Record<string, unknown>;

// ============================================
// PRODUCT METADATA
// ============================================

export type MktProductMetadata = {
  tags?: string[];
  color?: string;
  category?: string;
  features?: string[];
  deployment?: string;
  targetAudience?: string;
} & Record<string, unknown>;

// ============================================
// PRODUCT RESPONSE
// ============================================

export type MktProductResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: MktCreatedByActor | null;
  updatedBy: MktUpdatedByActor | null;
  productName: MktLocalizedText;
  productDescription: MktLocalizedText;
  productOverview: MktLocalizedText;
  code: string;
  status: string;
  version: string;
  entityVersion: number;
  basePrice: number;
  iconUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  sortOrder: number;
  metadata: MktProductMetadata;
  name: string | null;
  description: string | null;
};

// ============================================
// LICENSE RESPONSE
// ============================================

export type MktLicenseResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: MktCreatedByActor | null;
  updatedBy: MktUpdatedByActor | null;
  version: number;
  licenseKey: string;
  type: MktLicenseTypeValue;
  originalType: MktLicenseTypeValue;
  status: MktLicenseStatusType;
  startDate: string | null;
  endDate: string | null;
  maxDevices: number;
  metadata: MktLicenseMetadata;
  userId: string;
  productId: string;
  product?: MktProductResponse;
};

// ============================================
// PAGINATED RESPONSE
// ============================================

export type MktPaginatedLicenseResponse = {
  data: MktLicenseResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ============================================
// LICENSE VALIDATION
// ============================================

export type MktLicenseValidationResult = {
  isValid: boolean;
  reason?: string;
  license?: MktLicenseResponse;
};

// ============================================
// ANALYTICS
// ============================================

export const MKT_ANALYTICS_GROUP_BY = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type MktAnalyticsGroupByType =
  (typeof MKT_ANALYTICS_GROUP_BY)[keyof typeof MKT_ANALYTICS_GROUP_BY];

export type MktLicenseAnalytics = {
  total: number;
  byStatus: Record<string, number>;
  queryPeriod?: {
    startDate: string;
    endDate: string;
  };
};

// ============================================
// API RESPONSE WRAPPER
// ============================================

export type MktLicenseApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type MktLicenseApiErrorResponse = {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
};

// ============================================
// QUERY PARAMS
// ============================================

export type MktQueryLicensesParams = {
  page?: number;
  limit?: number;
  userId?: string;
  productId?: string;
  status?: MktLicenseStatusType;
};

// ============================================
// PAYLOADS
// ============================================

export type MktCreateLicensePayload = {
  productPackageId: string;
  productId: string;
  userId: string;
  maxDevices?: number;
};

export type MktUpdateLicensePayload = {
  type?: MktLicenseTypeValue | string;
  status?: MktLicenseStatusType | string;
  startDate?: string;
  endDate?: string;
  maxDevices?: number;
  metadata?: Record<string, unknown>;
  updatedBy?: MktUpdatedByActor | string;
};

export type MktValidateLicensePayload = {
  licenseKey: string;
  productId?: string;
};

export type MktBulkCreateLicensePayload = {
  items: MktCreateLicensePayload[];
};

export type MktBulkUpdateLicensePayload = {
  items: {
    id: string;
    updates: MktUpdateLicensePayload;
  }[];
};

export type MktBulkDeleteLicensePayload = {
  ids: string[];
};

export type MktLicenseAnalyticsQueryParams = {
  productId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: MktAnalyticsGroupByType;
};
