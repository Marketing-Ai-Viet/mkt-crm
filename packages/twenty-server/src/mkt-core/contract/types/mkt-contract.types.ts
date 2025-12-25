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
