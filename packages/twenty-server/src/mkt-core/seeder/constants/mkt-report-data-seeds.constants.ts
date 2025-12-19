type MktReportDataSeed = {
  id: string;
  name: string;
  reportType: string;
  metadata: string; // JSON string
  notes: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_REPORT_DATA_SEED_COLUMNS: (keyof MktReportDataSeed)[] = [
  'id',
  'name',
  'reportType',
  'metadata',
  'notes',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

// prettier-ignore
export const MKT_REPORT_DATA_SEEDS_IDS = {
  ID_1: 'b8acdd19-4852-415a-a783-83bd1231381c',
};

// prettier-ignore
export const MKT_REPORT_DATA_SEEDS: MktReportDataSeed[] = [
  {
    id: MKT_REPORT_DATA_SEEDS_IDS.ID_1,
    name: 'Monthly Sales Report',
    reportType: 'sales',
    metadata: JSON.stringify({
      period: 'monthly',
      metrics: ['totalSales', 'newCustomers', 'returningCustomers'],
      filters: { region: 'all', productCategory: 'all' },
    }),
    notes: 'A comprehensive report detailing monthly sales performance.',
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },
];
