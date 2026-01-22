/**
 * Optimistic Locking Types
 *
 * Generic types cho optimistic locking pattern.
 * Sử dụng cho các entity cần concurrent edit protection.
 */

/**
 * Entity interface required for optimistic locking
 * Entity phải có field 'version' để track changes
 */
export type VersionedEntity = {
  id: string;
  version: number | null;
  updatedAt?: string | Date | null;
};

/**
 * Result của optimistic update operation
 * Generic type T đại diện cho entity type
 */
export type OptimisticUpdateResult<
  T extends VersionedEntity = VersionedEntity,
> = {
  /** Update có thành công không */
  success: boolean;
  /** Version mới sau khi update thành công */
  newVersion?: number;
  /** Error message nếu thất bại */
  error?: string;
  /** Thông tin conflict nếu version mismatch */
  conflict?: ConflictInfo;
  /** Current entity data (trả về khi có conflict) */
  currentData?: T;
};

/**
 * Represents một field conflict
 * Chứa thông tin về giá trị của user và giá trị hiện tại trong DB
 */
export type FieldConflict = {
  /** Tên field bị conflict */
  field: string;
  /** Giá trị user đang muốn save */
  yourValue: unknown;
  /** Giá trị hiện tại trong DB */
  currentValue: unknown;
};

/**
 * Full conflict information
 * Trả về khi có version mismatch
 */
export type ConflictInfo = {
  /** Version hiện tại trong DB */
  currentVersion: number;
  /** Danh sách các fields bị conflict */
  conflicts: FieldConflict[];
  /** Thời điểm entity được update lần cuối */
  modifiedAt?: Date;
};

/**
 * Conflict resolution strategies
 * - KEEP_MINE: Giữ giá trị của user, ghi đè lên DB
 * - KEEP_THEIRS: Giữ giá trị trong DB, discard changes của user
 * - MERGE: User chọn từng field
 */
export type ConflictResolutionStrategy = 'KEEP_MINE' | 'KEEP_THEIRS' | 'MERGE';

/**
 * Configuration cho optimistic locking service
 * Truyền vào constructor của BaseOptimisticLockingService
 */
export type OptimisticLockingConfig = {
  /** Entity name cho repository lookup (e.g., 'mktOrder') */
  entityName: string;
  /**
   * Danh sách fields có thể edit (dùng cho conflict detection).
   *
   * **IMPORTANT**: Chỉ các fields trong list này được check conflict.
   * Fields không nằm trong list sẽ KHÔNG được detect conflict,
   * nhưng vẫn được update nếu có trong data payload.
   */
  editableFields: readonly string[];
  /** Log context cho debugging */
  logContext: string;
  /**
   * Optional: Danh sách fields cần select khi fetch entity cho conflict UI.
   * Nếu không set, trả về toàn bộ entity (có thể chứa sensitive data).
   *
   * Sử dụng để:
   * - Giới hạn data cho privacy (không expose toàn bộ entity)
   * - Cải thiện performance (giảm data transfer)
   *
   * @example ['id', 'version', 'name', 'note', 'updatedAt']
   */
  selectFields?: readonly string[];
};
