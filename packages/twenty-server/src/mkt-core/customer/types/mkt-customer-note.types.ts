import { MktCustomerNoteType } from 'src/mkt-core/customer/constants';

/**
 * Data for creating customer note
 */
export type CreateCustomerNoteData = {
  customerId: string;
  content: string;
  noteType?: MktCustomerNoteType;
};

/**
 * Options for querying customer notes
 */
export type CustomerNoteQueryOptions = {
  limit?: number;
  offset?: number;
  noteType?: MktCustomerNoteType;
};
