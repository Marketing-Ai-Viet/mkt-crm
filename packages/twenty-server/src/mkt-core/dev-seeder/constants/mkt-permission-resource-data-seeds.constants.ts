import { PERMISSION_RESOURCES_SEED } from 'src/mkt-core/mkt-permission-template/constants/permission-resources.constants';

type MktPermissionResourceDataSeed = {
  id: string;
  resourceKey: string;
  resourceName: string;
  resourceCategory: string;
  description?: string;
  isSystemResource: boolean;
  isActive: boolean;
  displayOrder: number;
  icon?: string;
  colorCode?: string;
  position?: number;
};

export const MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS: (keyof MktPermissionResourceDataSeed)[] =
  [
    'id',
    'resourceKey',
    'resourceName',
    'resourceCategory',
    'description',
    'isSystemResource',
    'isActive',
    'displayOrder',
    'icon',
    'colorCode',
    'position',
  ];

// Convert resource constants to data seed format
export const MKT_PERMISSION_RESOURCE_DATA_SEEDS: MktPermissionResourceDataSeed[] =
  PERMISSION_RESOURCES_SEED.map((resource, index) => ({
    id: resource.id,
    resourceKey: resource.resourceKey,
    resourceName: resource.resourceName,
    resourceCategory: resource.resourceCategory,
    description: resource.description,
    isSystemResource: resource.isSystemResource,
    isActive: resource.isActive,
    displayOrder: resource.displayOrder,
    icon: resource.icon,
    colorCode: resource.colorCode,
    position: (index + 1) * 100, // Position for sorting (100, 200, 300, etc.)
  }));
