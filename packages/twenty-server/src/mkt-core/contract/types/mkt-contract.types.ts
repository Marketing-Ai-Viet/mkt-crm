import {
  MKT_CONTRACT_STATUS,
  MKT_CONTRACT_TYPE,
} from 'src/mkt-core/contract/constants';

/**
 * Contract Repository Types
 */

// Options for finding contracts
export type FindContractOptions = {
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

// Options for finding with limit/offset
export type FindWithPaginationOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Contract Service Types
 */

// Input type for creating contract from order
export type CreateContractFromOrderInput = {
  orderId: string;
  customerId: string | null;
  orderCode: string | null;
  createdById: string | null;
  workspaceId: string;
};

// Data to create contract
export type CreateContractData = {
  name: string;
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  status: MKT_CONTRACT_STATUS;
  contractType?: MKT_CONTRACT_TYPE;
  customerId?: string | null;
  createdById?: string | null;
  description?: string | null;
};

// Data to update contract
export type UpdateContractData = {
  name?: string;
  contractNumber?: string;
  startDate?: Date;
  endDate?: Date;
  status?: MKT_CONTRACT_STATUS | string | null;
  contractType?: MKT_CONTRACT_TYPE | string | null;
  signedDate?: Date | null;
  filePath?: string | null;
  fileName?: string | null;
  description?: string | null;
  customerId?: string | null;
  accountOwnerId?: string | null;
};

// Contract number generation result
export type ContractNumberResult = {
  contractNumber: string;
  prefix: string;
  datePrefix: string;
  sequence: number;
};

// Status distribution statistics
export type StatusDistributionItem = {
  status: string;
  count: number;
};

// ============================================================================
// SERVICE OPERATION TYPES
// ============================================================================

/**
 * Result type for service operations
 */
export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create contract input from GraphQL
 */
export type CreateContractServiceInput = {
  name: string;
  contractNumber?: string;
  contractType?: MKT_CONTRACT_TYPE;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  filePath?: string;
  fileName?: string;
  description?: string;
  customerId?: string;
  accountOwnerId?: string;
  workspaceMemberId?: string;
};

/**
 * Update contract input from GraphQL
 */
export type UpdateContractServiceInput = {
  id: string;
  name?: string;
  contractNumber?: string;
  status?: MKT_CONTRACT_STATUS;
  contractType?: MKT_CONTRACT_TYPE;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  filePath?: string;
  fileName?: string;
  description?: string;
  customerId?: string;
  accountOwnerId?: string;
};

/**
 * Create contract result
 */
export type CreateContractResult = {
  contractId: string;
  contractNumber: string;
  status: MKT_CONTRACT_STATUS;
};

/**
 * Update contract result
 */
export type UpdateContractResult = {
  contractId: string;
  previousStatus: MKT_CONTRACT_STATUS;
  newStatus: MKT_CONTRACT_STATUS;
};

/**
 * Delete contract result
 */
export type DeleteContractResult = {
  contractId: string;
};

/**
 * Restore contract result
 */
export type RestoreContractResult = {
  contractId: string;
  status: MKT_CONTRACT_STATUS;
};

/**
 * Customer contract statistics
 */
export type CustomerContractStats = {
  contractCount: number;
  activeCount: number;
  expiredCount: number;
  firstContractDate?: string;
  lastContractDate?: string;
};

/**
 * Query options with DataScope context
 */
export type ContractQueryOptions = {
  take?: number;
  skip?: number;
  filter?: Record<string, unknown> | Record<string, unknown>[];
  hasFullAccess?: boolean;
};
