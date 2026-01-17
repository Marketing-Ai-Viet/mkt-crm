export type PermissionActionSeed = {
  id: string;
  actionKey: string;
  actionName: string;
  actionCategory: string;
  description: string;
  riskLevel: string;
  requiresApproval: boolean;
  isSystemAction: boolean;
  isActive: boolean;
};

export type PermissionResourceSeed = {
  id: string;
  resourceKey: string;
  resourceName: string;
  resourceCategory: string;
  description: string;
  isSystemResource: boolean;
  isActive: boolean;
  displayOrder: number;
  icon: string;
  colorCode: string;
};
