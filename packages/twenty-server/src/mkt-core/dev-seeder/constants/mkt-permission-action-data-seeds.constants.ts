import { PERMISSION_ACTIONS_SEED } from 'src/mkt-core/mkt-permission-template/constants/permission-actions.constants';

type MktPermissionActionDataSeed = {
  id: string;
  actionKey: string;
  actionName: string;
  actionCategory: string;
  description: string;
  riskLevel: string;
  requiresApproval: boolean;
  isSystemAction: boolean;
  isActive: boolean;
  position?: number;
};

export const MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS: (keyof MktPermissionActionDataSeed)[] =
  [
    'id',
    'actionKey',
    'actionName',
    'actionCategory',
    'description',
    'riskLevel',
    'requiresApproval',
    'isSystemAction',
    'isActive',
    'position',
  ];

// Convert action constants to data seed format
export const MKT_PERMISSION_ACTION_DATA_SEEDS: MktPermissionActionDataSeed[] =
  PERMISSION_ACTIONS_SEED.map((action, index) => ({
    id: action.id,
    actionKey: action.actionKey,
    actionName: action.actionName,
    actionCategory: action.actionCategory,
    description: action.description,
    riskLevel: action.riskLevel,
    requiresApproval: action.requiresApproval,
    isSystemAction: action.isSystemAction,
    isActive: action.isActive,
    position: (index + 1) * 100, // Position for sorting (100, 200, 300, etc.)
  }));
