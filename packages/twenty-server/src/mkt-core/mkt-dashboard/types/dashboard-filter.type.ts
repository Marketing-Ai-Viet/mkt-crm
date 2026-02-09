export type DashboardFilter = {
  departmentId?: string;
  staffId?: string;
  customerTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  orderStatus?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'LOCKED' | 'PROCESSING';
  dateRange?: {
    start?: string;
    end?: string;
  };
};
