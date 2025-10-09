import { MKT_VALUE_DATA_SEEDS_IDS } from 'src/mkt-core/dev-seeder/product-seeder/mkt-value-data-seeds.constants';
import { MKT_VARIANT_DATA_SEEDS_IDS } from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-data-seeds.constants';

type MKT_VARIANT_VALUE_DATA_SEED = {
  id: string;
  name: string;

  mktVariantId: string;
  mktValueId: string;

  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

// prettier-ignore
export const MKT_VARIANT_VALUE_DATA_SEED_COLUMNS: (keyof MKT_VARIANT_VALUE_DATA_SEED)[] = [
  'id',
  'name',
  'mktVariantId',
  'mktValueId',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];
// "uuid_generate_v4"

export const MKT_VARIANT_VALUE_FIELD_IDS = {
  YEAR_DURATION_1: '6aa211b1-7bcc-46c9-86d7-7646b7f6fc11',
  YEAR_DURATION_2: 'be7a9fcc-fdb9-4857-88c9-f4155c52d668',
  YEAR_DURATION_FOREVER: '750aaf2d-4ae4-4226-8005-09290e84d993',
};

// prettier-ignore
export const MKT_VARIANT_VALUE_DATA_SEEDS: MKT_VARIANT_VALUE_DATA_SEED[] = [
    {
        id: MKT_VARIANT_VALUE_FIELD_IDS.YEAR_DURATION_1,
        name: '1 Year',
        mktVariantId: MKT_VARIANT_DATA_SEEDS_IDS.MKT_CARE_BASIC_1_YEAR,
        mktValueId: MKT_VALUE_DATA_SEEDS_IDS.MKT_YEAR_DURATION_1_ID,
        position: 1,
        createdBySource: 'API',
        createdByWorkspaceMemberId: null,
        createdByName: 'Dev Seeder',
    },
    {
        id: MKT_VARIANT_VALUE_FIELD_IDS.YEAR_DURATION_2,
        name: '2 Years',
        mktVariantId: MKT_VARIANT_DATA_SEEDS_IDS.MKT_INSTA_BASIC_2_YEAR,
        mktValueId: MKT_VALUE_DATA_SEEDS_IDS.MKT_YEAR_DURATION_2_ID,
        position: 2,
        createdBySource: 'API',
        createdByWorkspaceMemberId: null,
        createdByName: 'Dev Seeder',
    },
    {
        id: MKT_VARIANT_VALUE_FIELD_IDS.YEAR_DURATION_FOREVER,
        name: 'Forever',
        mktVariantId: MKT_VARIANT_DATA_SEEDS_IDS.MKT_PAGE_BASIC_FOREVER,
        mktValueId: MKT_VALUE_DATA_SEEDS_IDS.MKT_YEAR_DURATION_FOREVER_ID,
        position: 3,
        createdBySource: 'API',
        createdByWorkspaceMemberId: null,
        createdByName: 'Dev Seeder',
    }
]
