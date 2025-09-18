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
  OWN_RECORDS_ONLY: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  DEPARTMENT_RECORDS: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  TEAM_RECORDS: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  ALL_RECORDS: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  BUSINESS_HOURS_ONLY: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  OFFICE_LOCATION_ONLY: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  CUSTOM_FILTER_TEMPLATE: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
};

export const MKT_PERMISSION_CONTEXT_DATA_SEEDS: MktPermissionContextDataSeed[] =
  [
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OWN_RECORDS_ONLY,
      name: 'Own Records Only',
      description: 'Access limited to records owned by the current user',
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
        description: 'Must have an owner field for filtering',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.DEPARTMENT_RECORDS,
      name: 'Department Records',
      description: "Access limited to records within user's department",
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
        description: 'Must have a department field for filtering',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.TEAM_RECORDS,
      name: 'Team Records',
      description: "Access limited to records within user's team",
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
        description: 'Must have a team field for filtering',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.ALL_RECORDS,
      name: 'All Records',
      description: 'Full access to all records without restrictions',
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
        description: 'No restrictions - grants full access',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.BUSINESS_HOURS_ONLY,
      name: 'Business Hours Only',
      description: 'Access restricted to business hours (9 AM - 5 PM)',
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
        description: 'Must specify valid time range with start/end hours',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.OFFICE_LOCATION_ONLY,
      name: 'Office Location Only',
      description: 'Access restricted to office IP ranges or locations',
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
        description: 'Must specify valid IP ranges or location identifiers',
      }),
    },
    {
      id: MKT_PERMISSION_CONTEXT_DATA_SEED_IDS.CUSTOM_FILTER_TEMPLATE,
      name: 'Custom Filter Template',
      description: 'Flexible custom filter for specific use cases',
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
        description: 'Must provide valid custom query with conditions',
      }),
    },
  ];
