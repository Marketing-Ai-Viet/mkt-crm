export type OffsetPaginationDto = {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalRecords: number;
  totalPages: number;
};

export type OffsetPaginatedDto<T> = {
  data: T[];
  pagination: OffsetPaginationDto;
};
