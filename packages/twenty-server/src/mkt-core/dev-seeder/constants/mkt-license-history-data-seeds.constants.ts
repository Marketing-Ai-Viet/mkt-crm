import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/constants/license.constants';

type MktLicenseHistoryDataSeed = {
  //fields
  id: string;
  name: string;
  action: MKT_LICENSE_STATUS;
  note: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_LICENSE_HISTORY_DATA_SEED_COLUMNS: (keyof MktLicenseHistoryDataSeed)[] =
  [
    'id',
    'name',
    'action',
    'note',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_LICENSE_HISTORY_DATA_SEEDS: MktLicenseHistoryDataSeed[] = [
  {
    id: '20202020-a305-41e7-8c72-ba44072a4c60',
    name: 'Khởi tạo license history',
    action: MKT_LICENSE_STATUS.ACTIVE,
    note: 'Lịch sử khởi tạo license',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
];
