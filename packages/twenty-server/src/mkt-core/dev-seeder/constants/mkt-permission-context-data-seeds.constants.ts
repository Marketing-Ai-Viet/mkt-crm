import { CONTEXT_TYPE } from 'src/mkt-core/mkt-permission-template/constants/permission-template-options.constants';

type MktPermissionContextDataSeed = {
  id: string;
  name: string;
  description?: string;
  contextType: string;
  filterExpression?: string;
  contextKey: string;
  priority: number;
  isActive: boolean;
  isSystemDefault: boolean;
  validationRules?: string;
  position: number; // For seeding order
};

export const MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS: (keyof MktPermissionContextDataSeed)[] =
  [
    'id',
    'name',
    'description',
    'contextType',
    'contextKey',
    'priority',
    'isActive',
    'isSystemDefault',
    'position',
    'filterExpression',
    'validationRules',
  ];

export const MKT_PERMISSION_CONTEXT_DATA_SEED_IDS = {
  // Basic Hierarchy Contexts (Existing)
  OWN_RECORDS_ONLY: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  DEPARTMENT_RECORDS: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  TEAM_RECORDS: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  ALL_RECORDS: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  BUSINESS_HOURS_ONLY: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  OFFICE_LOCATION_ONLY: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  CUSTOM_FILTER_TEMPLATE: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',

  // Advanced Hierarchy Contexts (Enterprise)
  REGION_RECORDS: 'f7955d8f-198f-4ab0-9984-38820e7da1e6',
  DIVISION_RECORDS: '2b880480-bf14-440e-9dc8-2623c5ec3cc7',
  BUSINESS_UNIT_RECORDS: 'a6365d41-a526-4959-8f3b-973784061b63',
  SUBSIDIARY_RECORDS: '0b1191e4-95a4-4595-8c59-bb8a305dcd34',
  BRANCH_RECORDS: '7d327868-9746-43f2-a50d-357ecd2eb7e2',

  // Data Classification Contexts (Enterprise)
  CONFIDENTIAL_ONLY: 'c65f9c93-ff4f-41d1-9a36-8d158041f7a2',
  PUBLIC_RECORDS: 'b30a8afa-fe84-4b44-b708-b156640c8c5c',
  RESTRICTED_DATA: '49611b1f-e7e9-46d3-9f56-1168fec02442',
  FINANCIAL_SENSITIVE: '0b59b731-74fc-4549-9c70-896c155c298f',
  PII_PROTECTED: '1763b884-f2c3-4f22-9ec3-8656f368a61d',

  // Compliance & Regulatory Contexts (Enterprise)
  GDPR_COMPLIANT: '10566b13-9e0e-43d8-b623-78d7c8584a73',
  SOX_CONTROLLED: '580dc026-c008-4da0-aadd-50a1710cb0d2',
  HIPAA_PROTECTED: '88336819-e658-44cc-a813-fc066cdb19f7',
  AUDIT_TRACKED: '47fb6123-a2f1-48c8-8ea9-ff3c2d22577e',
  RETENTION_POLICY: '81d90a4d-9160-4590-91d2-e1f06c01759e',

  // Advanced Security Contexts (Enterprise)
  DEVICE_LIMITED: '294686f8-5a96-4315-b6b5-f4edfac5162f',
  IP_WHITELIST: '253b3dd1-ff07-4e0f-90d9-5ca1677d83f7',
  VPN_REQUIRED: '434fb2eb-f9d0-441b-b07c-be0df8af5c46',
  MFA_PROTECTED: '62634e40-2380-4c4b-9315-843954448608',
  CERTIFICATE_BASED: '62adfb2c-a9d7-4301-a823-8540f8977956',

  // Dynamic & Conditional Contexts (Enterprise)
  VALUE_BASED: '20817cb9-3dcb-40be-8d3b-7f07e651142e',
  RISK_BASED: '182a6afd-8603-41d4-831b-ae0eb825d2a7',
  APPROVAL_CHAIN: 'c9499757-8d9c-4e1c-974e-94fb2a81d475',
  WORKFLOW_STATE: 'c5d04073-d372-4859-8538-165bbbb421b5',
  DELEGATION_CHAIN: 'e784abd5-7061-456d-85e4-49817d4e12c2',

  // Multi-Tenant & Cross-Org Contexts (Enterprise)
  TENANT_ISOLATED: 'c1719de7-8544-420e-9aaa-6bf1d1e1a25a',
  CROSS_TENANT: 'dcfee5d8-3d8d-445c-975d-1ff2501a0a22',
  PARTNER_SHARED: 'a47bdf49-7d30-4fa9-87ae-77f1bd1297a7',
  VENDOR_ACCESS: '4a3a91c7-0ec0-40f6-9d1a-7aefc0775d13',
  CLIENT_PORTAL: 'f65faa4d-9c08-422d-98a6-9b288766a131',
};

export const MKT_PERMISSION_CONTEXT_DATA_SEEDS: MktPermissionContextDataSeed[] =
  [
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      name: 'Own Records Only',
      description: 'Chỉ truy cập các bản ghi do người dùng hiện tại sở hữu',
      contextType: CONTEXT_TYPE.OWN_RECORDS,
      contextKey: 'own',
      priority: 10,
      isActive: true,
      isSystemDefault: true,
      position: 1,
      filterExpression: JSON.stringify({
        field: 'ownerId',
        operator: 'eq',
        value: '{{currentUserId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['ownerId'],
        supportedOperators: ['eq'],
        description: 'Phải có trường owner để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      name: 'Department Records',
      description: 'Chỉ truy cập các bản ghi trong phòng ban của người dùng',
      contextType: CONTEXT_TYPE.DEPARTMENT_RECORDS,
      contextKey: 'department',
      priority: 20,
      isActive: true,
      isSystemDefault: true,
      position: 2,
      filterExpression: JSON.stringify({
        field: 'departmentId',
        operator: 'eq',
        value: '{{currentUserDepartmentId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['departmentId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường phòng ban để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      name: 'Team Records',
      description: 'Chỉ truy cập các bản ghi trong nhóm của người dùng',
      contextType: CONTEXT_TYPE.TEAM_RECORDS,
      contextKey: 'team',
      priority: 15,
      isActive: true,
      isSystemDefault: true,
      position: 3,
      filterExpression: JSON.stringify({
        field: 'teamId',
        operator: 'eq',
        value: '{{currentUserTeamId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['teamId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường nhóm để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      name: 'All Records',
      description: 'Toàn quyền truy cập tất cả các bản ghi không bị hạn chế',
      contextType: CONTEXT_TYPE.ALL_RECORDS,
      contextKey: 'all',
      priority: 100,
      isActive: true,
      isSystemDefault: true,
      position: 4,
      filterExpression: JSON.stringify({}),
      validationRules: JSON.stringify({
        requiredFields: [],
        supportedOperators: ['*'],
        description: 'Không có hạn chế - cấp toàn quyền truy cập',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.BUSINESS_HOURS_ONLY,
      name: 'Business Hours Only',
      description: 'Chỉ cho phép truy cập trong giờ hành chính (9 AM - 5 PM)',
      contextType: CONTEXT_TYPE.TIME_LIMITED,
      contextKey: 'business_hours',
      priority: 30,
      isActive: true,
      isSystemDefault: true,
      position: 5,
      filterExpression: JSON.stringify({
        timeRange: {
          startHour: 9,
          endHour: 17,
          timezone: 'UTC',
          workdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['timeRange'],
        supportedOperators: ['timeWithin'],
        description: 'Phải chỉ định khung giờ hợp lệ với giờ bắt đầu/kết thúc',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OFFICE_LOCATION_ONLY,
      name: 'Office Location Only',
      description:
        'Chỉ cho phép truy cập từ các dải IP văn phòng hoặc vị trí được phép',
      contextType: CONTEXT_TYPE.LOCATION_LIMITED,
      contextKey: 'office_only',
      priority: 40,
      isActive: true,
      isSystemDefault: false,
      position: 6,
      filterExpression: JSON.stringify({
        ipRanges: ['192.168.1.0/24', '10.0.0.0/8'],
        allowedLocations: ['office', 'vpn'],
      }),
      validationRules: JSON.stringify({
        requiredFields: ['ipRanges', 'allowedLocations'],
        supportedOperators: ['ipWithin', 'locationIn'],
        description: 'Phải chỉ định các dải IP hợp lệ hoặc mã định danh vị trí',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CUSTOM_FILTER_TEMPLATE,
      name: 'Custom Filter Template',
      description:
        'Bộ lọc tùy chỉnh linh hoạt cho các trường hợp sử dụng cụ thể',
      contextType: CONTEXT_TYPE.CUSTOM_FILTER,
      contextKey: 'custom',
      priority: 50,
      isActive: true,
      isSystemDefault: false,
      position: 7,
      filterExpression: JSON.stringify({
        customQuery: {
          fields: ['status', 'priority'],
          conditions: [
            { field: 'status', operator: 'in', values: ['active', 'pending'] },
            { field: 'priority', operator: 'gte', value: 'medium' },
          ],
          logic: 'AND',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['customQuery'],
        supportedOperators: [
          'eq',
          'neq',
          'gt',
          'gte',
          'lt',
          'lte',
          'in',
          'nin',
          'like',
        ],
        description:
          'Phải cung cấp truy vấn tùy chỉnh hợp lệ với các điều kiện',
      }),
    },

    // Advanced Hierarchy Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.REGION_RECORDS,
      name: 'Region Records',
      description:
        'Chỉ truy cập các bản ghi trong khu vực địa lý của người dùng',
      contextType: CONTEXT_TYPE.REGION_RECORDS,
      contextKey: 'region',
      priority: 60,
      isActive: true,
      isSystemDefault: true,
      position: 8,
      filterExpression: JSON.stringify({
        field: 'regionId',
        operator: 'eq',
        value: '{{currentUserRegionId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['regionId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường khu vực để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DIVISION_RECORDS,
      name: 'Division Records',
      description:
        'Chỉ truy cập các bản ghi trong khối/tập đoàn của người dùng',
      contextType: CONTEXT_TYPE.DIVISION_RECORDS,
      contextKey: 'division',
      priority: 70,
      isActive: true,
      isSystemDefault: true,
      position: 9,
      filterExpression: JSON.stringify({
        field: 'divisionId',
        operator: 'eq',
        value: '{{currentUserDivisionId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['divisionId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường khối/tập đoàn để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.BUSINESS_UNIT_RECORDS,
      name: 'Business Unit Records',
      description:
        'Chỉ truy cập các bản ghi trong đơn vị kinh doanh của người dùng',
      contextType: CONTEXT_TYPE.BUSINESS_UNIT_RECORDS,
      contextKey: 'business_unit',
      priority: 65,
      isActive: true,
      isSystemDefault: true,
      position: 10,
      filterExpression: JSON.stringify({
        field: 'businessUnitId',
        operator: 'eq',
        value: '{{currentUserBusinessUnitId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['businessUnitId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường đơn vị kinh doanh để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.SUBSIDIARY_RECORDS,
      name: 'Subsidiary Records',
      description: 'Chỉ truy cập các bản ghi trong công ty con của người dùng',
      contextType: CONTEXT_TYPE.SUBSIDIARY_RECORDS,
      contextKey: 'subsidiary',
      priority: 75,
      isActive: true,
      isSystemDefault: true,
      position: 11,
      filterExpression: JSON.stringify({
        field: 'subsidiaryId',
        operator: 'eq',
        value: '{{currentUserSubsidiaryId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['subsidiaryId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường công ty con để lọc dữ liệu',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.BRANCH_RECORDS,
      name: 'Branch Records',
      description:
        'Chỉ truy cập các bản ghi trong chi nhánh văn phòng của người dùng',
      contextType: CONTEXT_TYPE.BRANCH_RECORDS,
      contextKey: 'branch',
      priority: 55,
      isActive: true,
      isSystemDefault: true,
      position: 12,
      filterExpression: JSON.stringify({
        field: 'branchId',
        operator: 'eq',
        value: '{{currentUserBranchId}}',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['branchId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có trường chi nhánh để lọc dữ liệu',
      }),
    },

    // Data Classification Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CONFIDENTIAL_ONLY,
      name: 'Confidential Data Only',
      description: 'Chỉ cho phép truy cập dữ liệu được phân loại mật',
      contextType: CONTEXT_TYPE.CONFIDENTIAL_ONLY,
      contextKey: 'confidential',
      priority: 90,
      isActive: true,
      isSystemDefault: false,
      position: 13,
      filterExpression: JSON.stringify({
        field: 'dataClassification',
        operator: 'eq',
        value: 'CONFIDENTIAL',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['dataClassification'],
        supportedOperators: ['eq'],
        description: 'Phải có trường phân loại dữ liệu được đặt thành MẬT',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.PUBLIC_RECORDS,
      name: 'Public Records Only',
      description: 'Chỉ truy cập dữ liệu có thể truy cập công khai',
      contextType: CONTEXT_TYPE.PUBLIC_RECORDS,
      contextKey: 'public',
      priority: 10,
      isActive: true,
      isSystemDefault: true,
      position: 14,
      filterExpression: JSON.stringify({
        field: 'dataClassification',
        operator: 'eq',
        value: 'PUBLIC',
      }),
      validationRules: JSON.stringify({
        requiredFields: ['dataClassification'],
        supportedOperators: ['eq'],
        description:
          'Phải có trường phân loại dữ liệu được đặt thành CÔNG KHAI',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.RESTRICTED_DATA,
      name: 'Restricted Data Access',
      description:
        'Truy cập dữ liệu được phân loại hạn chế với xác thực đặc biệt',
      contextType: CONTEXT_TYPE.RESTRICTED_DATA,
      contextKey: 'restricted',
      priority: 85,
      isActive: true,
      isSystemDefault: false,
      position: 15,
      filterExpression: JSON.stringify({
        field: 'dataClassification',
        operator: 'eq',
        value: 'RESTRICTED',
        additionalConditions: {
          userClearanceLevel: '{{currentUserClearanceLevel}}',
          requiredClearance: 'RESTRICTED',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['dataClassification', 'userClearanceLevel'],
        supportedOperators: ['eq'],
        description: 'Phải có mức xác thực hạn chế',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.FINANCIAL_SENSITIVE,
      name: 'Financial Sensitive Data',
      description: 'Truy cập dữ liệu tài chính nhạy cảm (tuân thủ SOX)',
      contextType: CONTEXT_TYPE.FINANCIAL_SENSITIVE,
      contextKey: 'financial_sensitive',
      priority: 95,
      isActive: true,
      isSystemDefault: false,
      position: 16,
      filterExpression: JSON.stringify({
        field: 'isFinancialSensitive',
        operator: 'eq',
        value: true,
        additionalConditions: {
          userFinancialClearance: true,
          soxCompliant: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['isFinancialSensitive', 'userFinancialClearance'],
        supportedOperators: ['eq'],
        description: 'Phải có xác thực tài chính để tuân thủ SOX',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.PII_PROTECTED,
      name: 'PII Protected Data',
      description: 'Truy cập thông tin nhận dạng cá nhân (GDPR/CCPA)',
      contextType: CONTEXT_TYPE.PII_PROTECTED,
      contextKey: 'pii_protected',
      priority: 88,
      isActive: true,
      isSystemDefault: false,
      position: 17,
      filterExpression: JSON.stringify({
        field: 'containsPII',
        operator: 'eq',
        value: true,
        additionalConditions: {
          userPIIClearance: true,
          gdprCompliant: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['containsPII', 'userPIIClearance'],
        supportedOperators: ['eq'],
        description: 'Phải có xác thực PII để tuân thủ GDPR/CCPA',
      }),
    },

    // Compliance & Regulatory Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.GDPR_COMPLIANT,
      name: 'GDPR Compliant Access',
      description: 'Truy cập tuân thủ GDPR với sự đồng ý và ghi log phù hợp',
      contextType: CONTEXT_TYPE.GDPR_COMPLIANT,
      contextKey: 'gdpr_compliant',
      priority: 92,
      isActive: true,
      isSystemDefault: false,
      position: 18,
      filterExpression: JSON.stringify({
        gdprConsent: true,
        auditLogging: true,
        dataSubjectRights: true,
        additionalConditions: {
          consentStatus: 'GRANTED',
          retentionPolicyApplied: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['gdprConsent', 'consentStatus'],
        supportedOperators: ['eq'],
        description: 'Phải có sự đồng ý GDPR hợp lệ và ghi log kiểm tra',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.SOX_CONTROLLED,
      name: 'SOX Controlled Data',
      description:
        'Truy cập dữ liệu tài chính được kiểm soát theo Sarbanes-Oxley',
      contextType: CONTEXT_TYPE.SOX_CONTROLLED,
      contextKey: 'sox_controlled',
      priority: 98,
      isActive: true,
      isSystemDefault: false,
      position: 19,
      filterExpression: JSON.stringify({
        soxControlled: true,
        auditTrail: true,
        segregationOfDuties: true,
        additionalConditions: {
          financialYear: '{{currentFinancialYear}}',
          approvalRequired: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['soxControlled', 'auditTrail'],
        supportedOperators: ['eq'],
        description: 'Phải tuân thủ các kiểm soát SOX và phân chia nhiệm vụ',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.HIPAA_PROTECTED,
      name: 'HIPAA Protected Data',
      description: 'Truy cập thông tin y tế được bảo vệ theo HIPAA',
      contextType: CONTEXT_TYPE.HIPAA_PROTECTED,
      contextKey: 'hipaa_protected',
      priority: 96,
      isActive: true,
      isSystemDefault: false,
      position: 20,
      filterExpression: JSON.stringify({
        hipaaProtected: true,
        minimumNecessary: true,
        auditLogging: true,
        additionalConditions: {
          userRole: ['HEALTHCARE_PROFESSIONAL', 'AUTHORIZED_PERSONNEL'],
          purposeOfUse: 'TREATMENT_PAYMENT_OPERATIONS',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['hipaaProtected', 'userRole'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải là nhân viên y tế được ủy quyền với mục đích hợp lệ',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.AUDIT_TRACKED,
      name: 'Audit Tracked Access',
      description: 'Theo dõi kiểm tra nâng cao cho các hoạt động nhạy cảm',
      contextType: CONTEXT_TYPE.AUDIT_TRACKED,
      contextKey: 'audit_tracked',
      priority: 80,
      isActive: true,
      isSystemDefault: false,
      position: 21,
      filterExpression: JSON.stringify({
        auditTracking: 'ENHANCED',
        logLevel: 'DETAILED',
        additionalConditions: {
          sessionRecording: true,
          activityMonitoring: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['auditTracking'],
        supportedOperators: ['eq'],
        description: 'Phải kích hoạt theo dõi kiểm tra nâng cao',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.RETENTION_POLICY,
      name: 'Retention Policy Governed',
      description: 'Truy cập dữ liệu được điều chỉnh bởi chính sách lưu trữ',
      contextType: CONTEXT_TYPE.RETENTION_POLICY,
      contextKey: 'retention_policy',
      priority: 60,
      isActive: true,
      isSystemDefault: true,
      position: 22,
      filterExpression: JSON.stringify({
        retentionPolicyApplied: true,
        additionalConditions: {
          dataAge: '{{calculateDataAge}}',
          retentionPeriod: '{{retentionPeriodDays}}',
          disposalDate: '{{calculateDisposalDate}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['retentionPolicyApplied'],
        supportedOperators: ['eq'],
        description: 'Phải tuân thủ chính sách lưu trữ dữ liệu',
      }),
    },

    // Advanced Security Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEVICE_LIMITED,
      name: 'Device Limited Access',
      description:
        'Truy cập giới hạn cho các thiết bị đã đăng ký và được phê duyệt',
      contextType: CONTEXT_TYPE.DEVICE_LIMITED,
      contextKey: 'device_limited',
      priority: 70,
      isActive: true,
      isSystemDefault: false,
      position: 23,
      filterExpression: JSON.stringify({
        deviceRegistered: true,
        deviceCompliant: true,
        additionalConditions: {
          deviceId: '{{currentDeviceId}}',
          deviceTrustLevel: 'HIGH',
          lastSecurityScan: '{{recentSecurityScan}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['deviceRegistered', 'deviceId'],
        supportedOperators: ['eq'],
        description: 'Phải sử dụng thiết bị đã đăng ký và tuân thủ',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.IP_WHITELIST,
      name: 'IP Whitelist Only',
      description:
        'Truy cập bị hạn chế cho các địa chỉ IP được đưa vào danh sách cho phép',
      contextType: CONTEXT_TYPE.IP_WHITELIST,
      contextKey: 'ip_whitelist',
      priority: 85,
      isActive: true,
      isSystemDefault: false,
      position: 24,
      filterExpression: JSON.stringify({
        allowedIPs: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12'],
        strictIPCheck: true,
        additionalConditions: {
          currentIP: '{{clientIP}}',
          geoLocationCheck: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['allowedIPs', 'currentIP'],
        supportedOperators: ['ipWithin'],
        description:
          'Phải truy cập từ các địa chỉ IP được đưa vào danh sách cho phép',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.VPN_REQUIRED,
      name: 'VPN Required Access',
      description: 'Truy cập yêu cầu kết nối VPN hoạt động',
      contextType: CONTEXT_TYPE.VPN_REQUIRED,
      contextKey: 'vpn_required',
      priority: 75,
      isActive: true,
      isSystemDefault: false,
      position: 25,
      filterExpression: JSON.stringify({
        vpnRequired: true,
        vpnActive: true,
        additionalConditions: {
          vpnProvider: 'CORPORATE_VPN',
          vpnEncryption: 'AES256',
          vpnAuthenticated: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['vpnRequired', 'vpnActive'],
        supportedOperators: ['eq'],
        description: 'Phải kết nối qua VPN của công ty',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.MFA_PROTECTED,
      name: 'MFA Protected Access',
      description: 'Truy cập yêu cầu xác thực đa yếu tố',
      contextType: CONTEXT_TYPE.MFA_PROTECTED,
      contextKey: 'mfa_protected',
      priority: 90,
      isActive: true,
      isSystemDefault: false,
      position: 26,
      filterExpression: JSON.stringify({
        mfaRequired: true,
        mfaVerified: true,
        additionalConditions: {
          mfaMethod: ['TOTP', 'SMS', 'PUSH', 'HARDWARE_TOKEN'],
          mfaTimestamp: '{{mfaVerificationTime}}',
          mfaValidityPeriod: 300,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['mfaRequired', 'mfaVerified'],
        supportedOperators: ['eq'],
        description: 'Phải hoàn thành xác thực đa yếu tố',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CERTIFICATE_BASED,
      name: 'Certificate Based Access',
      description: 'Truy cập yêu cầu xác thực chứng chỉ số hợp lệ',
      contextType: CONTEXT_TYPE.CERTIFICATE_BASED,
      contextKey: 'certificate_based',
      priority: 95,
      isActive: true,
      isSystemDefault: false,
      position: 27,
      filterExpression: JSON.stringify({
        certificateRequired: true,
        certificateValid: true,
        additionalConditions: {
          certificateType: 'X.509',
          certificateAuthority: 'CORPORATE_CA',
          certificateExpiry: '{{certificateExpiryDate}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['certificateRequired', 'certificateValid'],
        supportedOperators: ['eq'],
        description: 'Phải trình diện chứng chỉ số hợp lệ',
      }),
    },

    // Dynamic & Conditional Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.VALUE_BASED,
      name: 'Value Based Access',
      description: 'Truy cập dựa trên ngưỡng giá trị giao dịch/thỏa thuận',
      contextType: CONTEXT_TYPE.VALUE_BASED,
      contextKey: 'value_based',
      priority: 65,
      isActive: true,
      isSystemDefault: false,
      position: 28,
      filterExpression: JSON.stringify({
        valueThreshold: '{{userValueThreshold}}',
        additionalConditions: {
          dealValue: '{{recordValue}}',
          userAuthorizedLimit: '{{userMaxValue}}',
          approvalRequired: '{{valueRequiresApproval}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['valueThreshold', 'dealValue'],
        supportedOperators: ['lte', 'gte', 'between'],
        description: 'Phải tôn trọng giới hạn ủy quyền dựa trên giá trị',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.RISK_BASED,
      name: 'Risk Based Access',
      description:
        'Truy cập dựa trên đánh giá rủi ro và hồ sơ rủi ro của người dùng',
      contextType: CONTEXT_TYPE.RISK_BASED,
      contextKey: 'risk_based',
      priority: 70,
      isActive: true,
      isSystemDefault: false,
      position: 29,
      filterExpression: JSON.stringify({
        riskLevel: '{{calculateRiskLevel}}',
        userRiskProfile: '{{userRiskProfile}}',
        additionalConditions: {
          maxRiskLevel: 'MEDIUM',
          riskFactors: '{{analyzeRiskFactors}}',
          riskMitigation: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['riskLevel', 'userRiskProfile'],
        supportedOperators: ['eq', 'lte'],
        description: 'Phải vượt qua các kiểm tra đánh giá rủi ro',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.APPROVAL_CHAIN,
      name: 'Approval Chain Context',
      description: 'Truy cập được điều chỉnh bởi yêu cầu chuỗi phê duyệt',
      contextType: CONTEXT_TYPE.APPROVAL_CHAIN,
      contextKey: 'approval_chain',
      priority: 80,
      isActive: true,
      isSystemDefault: false,
      position: 30,
      filterExpression: JSON.stringify({
        approvalRequired: true,
        approvalStatus: '{{checkApprovalStatus}}',
        additionalConditions: {
          approvalChain: '{{buildApprovalChain}}',
          currentApprover: '{{currentApproverInChain}}',
          approvalLevel: '{{requiredApprovalLevel}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['approvalRequired', 'approvalStatus'],
        supportedOperators: ['eq'],
        description: 'Phải tuân theo yêu cầu chuỗi phê duyệt',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.WORKFLOW_STATE,
      name: 'Workflow State Context',
      description:
        'Truy cập dựa trên trạng thái và chuyển đổi quy trình hiện tại',
      contextType: CONTEXT_TYPE.WORKFLOW_STATE,
      contextKey: 'workflow_state',
      priority: 60,
      isActive: true,
      isSystemDefault: false,
      position: 31,
      filterExpression: JSON.stringify({
        workflowState: '{{currentWorkflowState}}',
        allowedStates: '{{userAllowedStates}}',
        additionalConditions: {
          stateTransitions: '{{allowedTransitions}}',
          workflowRole: '{{userWorkflowRole}}',
          statePermissions: '{{stateBasedPermissions}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['workflowState', 'allowedStates'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải tôn trọng quyền trạng thái quy trình',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DELEGATION_CHAIN,
      name: 'Delegation Chain Context',
      description: 'Truy cập thông qua chuỗi ủy quyền và quyền đại diện',
      contextType: CONTEXT_TYPE.DELEGATION_CHAIN,
      contextKey: 'delegation_chain',
      priority: 55,
      isActive: true,
      isSystemDefault: false,
      position: 32,
      filterExpression: JSON.stringify({
        delegationActive: true,
        delegatedBy: '{{delegatingUser}}',
        additionalConditions: {
          delegationScope: '{{delegationPermissions}}',
          delegationExpiry: '{{delegationExpiryDate}}',
          delegationLevel: '{{maxDelegationLevel}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['delegationActive', 'delegatedBy'],
        supportedOperators: ['eq'],
        description: 'Phải có chuỗi ủy quyền hợp lệ',
      }),
    },

    // Multi-Tenant & Cross-Org Contexts (Enterprise)
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TENANT_ISOLATED,
      name: 'Tenant Isolated Access',
      description: 'Truy cập cô lập nghiêm ngặt trong ranh giới tenant đơn lẻ',
      contextType: CONTEXT_TYPE.TENANT_ISOLATED,
      contextKey: 'tenant_isolated',
      priority: 100,
      isActive: true,
      isSystemDefault: true,
      position: 33,
      filterExpression: JSON.stringify({
        tenantId: '{{currentUserTenantId}}',
        strictIsolation: true,
        additionalConditions: {
          crossTenantAccess: false,
          tenantBoundaryEnforced: true,
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['tenantId'],
        supportedOperators: ['eq'],
        description: 'Phải thực thi cô lập tenant nghiêm ngặt',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CROSS_TENANT,
      name: 'Cross Tenant Access',
      description: 'Truy cập được kiểm soát trên nhiều tenant',
      contextType: CONTEXT_TYPE.CROSS_TENANT,
      contextKey: 'cross_tenant',
      priority: 90,
      isActive: true,
      isSystemDefault: false,
      position: 34,
      filterExpression: JSON.stringify({
        authorizedTenants: '{{userAuthorizedTenants}}',
        crossTenantPermission: true,
        additionalConditions: {
          tenantRelationship: 'AUTHORIZED',
          crossTenantRole: '{{crossTenantRole}}',
          auditLogging: 'ENHANCED',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['authorizedTenants', 'crossTenantPermission'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có quyền truy cập cross-tenant được ủy quyền',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.PARTNER_SHARED,
      name: 'Partner Shared Access',
      description: 'Truy cập dữ liệu được chia sẻ với các đối tác kinh doanh',
      contextType: CONTEXT_TYPE.PARTNER_SHARED,
      contextKey: 'partner_shared',
      priority: 70,
      isActive: true,
      isSystemDefault: false,
      position: 35,
      filterExpression: JSON.stringify({
        partnerAccess: true,
        partnershipActive: true,
        additionalConditions: {
          partnerId: '{{authorizedPartnerIds}}',
          dataShareAgreement: 'ACTIVE',
          partnershipLevel: '{{partnershipTier}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['partnerAccess', 'partnerId'],
        supportedOperators: ['eq', 'in'],
        description: 'Phải có thỏa thuận đối tác hiệu lực',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.VENDOR_ACCESS,
      name: 'Vendor Access Only',
      description:
        'Truy cập hạn chế cho người dùng nhà cung cấp và nhà cung ứng',
      contextType: CONTEXT_TYPE.VENDOR_ACCESS,
      contextKey: 'vendor_access',
      priority: 50,
      isActive: true,
      isSystemDefault: false,
      position: 36,
      filterExpression: JSON.stringify({
        vendorAccess: true,
        vendorContractActive: true,
        additionalConditions: {
          vendorId: '{{currentVendorId}}',
          accessScope: 'LIMITED',
          contractExpiry: '{{vendorContractExpiry}}',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['vendorAccess', 'vendorId'],
        supportedOperators: ['eq'],
        description: 'Phải là nhà cung cấp được ủy quyền với hợp đồng hiệu lực',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CLIENT_PORTAL,
      name: 'Client Portal Access',
      description: 'Truy cập cổng khách hàng cho các khách hàng bên ngoài',
      contextType: CONTEXT_TYPE.CLIENT_PORTAL,
      contextKey: 'client_portal',
      priority: 40,
      isActive: true,
      isSystemDefault: false,
      position: 37,
      filterExpression: JSON.stringify({
        clientPortalAccess: true,
        clientActive: true,
        additionalConditions: {
          clientId: '{{currentClientId}}',
          portalPermissions: '{{clientPortalPermissions}}',
          serviceAgreement: 'ACTIVE',
        },
      }),
      validationRules: JSON.stringify({
        requiredFields: ['clientPortalAccess', 'clientId'],
        supportedOperators: ['eq'],
        description:
          'Phải là khách hàng được ủy quyền với thỏa thuận dịch vụ hiệu lực',
      }),
    },
  ];
