/**
 * Error classes for Generic Combo module
 */

export class GenericComboError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GenericComboError';
  }
}

export class GenericComboNotFoundError extends GenericComboError {
  constructor(comboId: string) {
    super(`Generic combo ${comboId} not found`, 'GENERIC_COMBO_NOT_FOUND', {
      comboId,
    });
    this.name = 'GenericComboNotFoundError';
  }
}

/**
 * Error khi combo code đã tồn tại
 */
export class GenericComboDuplicateCodeError extends GenericComboError {
  constructor(comboCode: string) {
    super(
      `Combo with code ${comboCode} already exists`,
      'GENERIC_COMBO_DUPLICATE_CODE',
      { comboCode },
    );
    this.name = 'GenericComboDuplicateCodeError';
  }
}

/**
 * Error khi version conflict (optimistic locking)
 */
export class GenericComboVersionConflictError extends GenericComboError {
  constructor(comboId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Version conflict for combo ${comboId}: expected ${expectedVersion}, got ${actualVersion}`,
      'GENERIC_COMBO_VERSION_CONFLICT',
      { comboId, expectedVersion, actualVersion },
    );
    this.name = 'GenericComboVersionConflictError';
  }
}

/**
 * Error khi validation thất bại
 */
export class GenericComboValidationException extends GenericComboError {
  constructor(
    message: string,
    public readonly errors: Array<{
      field: string;
      message: string;
      code: string;
    }>,
  ) {
    super(message, 'GENERIC_COMBO_VALIDATION_FAILED', { errors });
    this.name = 'GenericComboValidationException';
  }
}

/**
 * Error khi combo item không tìm thấy
 */
export class GenericComboItemNotFoundError extends GenericComboError {
  constructor(itemId: string) {
    super(
      `Generic combo item ${itemId} not found`,
      'GENERIC_COMBO_ITEM_NOT_FOUND',
      {
        itemId,
      },
    );
    this.name = 'GenericComboItemNotFoundError';
  }
}

/**
 * Error khi item type không hợp lệ
 */
export class GenericComboInvalidItemTypeError extends GenericComboError {
  constructor(itemType: string) {
    super(
      `Invalid combo item type: ${itemType}`,
      'GENERIC_COMBO_INVALID_ITEM_TYPE',
      { itemType },
    );
    this.name = 'GenericComboInvalidItemTypeError';
  }
}

/**
 * Error khi thiếu required fields cho item type
 */
export class GenericComboMissingFieldsError extends GenericComboError {
  constructor(itemType: string, missingFields: string[]) {
    super(
      `Missing required fields for ${itemType}: ${missingFields.join(', ')}`,
      'GENERIC_COMBO_MISSING_FIELDS',
      { itemType, missingFields },
    );
    this.name = 'GenericComboMissingFieldsError';
  }
}

/**
 * Error khi price calculation thất bại
 */
export class GenericComboPriceCalculationError extends GenericComboError {
  constructor(message: string, comboId: string) {
    super(message, 'GENERIC_COMBO_PRICING_ERROR', { comboId });
    this.name = 'GenericComboPriceCalculationError';
  }
}

/**
 * Error khi combo inactive
 */
export class GenericComboInactiveError extends GenericComboError {
  constructor(comboId: string) {
    super(`Generic combo ${comboId} is inactive`, 'GENERIC_COMBO_INACTIVE', {
      comboId,
    });
    this.name = 'GenericComboInactiveError';
  }
}

/**
 * Error khi combo ngoài thời gian hiệu lực
 */
export class GenericComboExpiredError extends GenericComboError {
  constructor(comboId: string, expiredAt: Date) {
    super(
      `Generic combo ${comboId} expired at ${expiredAt.toISOString()}`,
      'GENERIC_COMBO_EXPIRED',
      { comboId, expiredAt: expiredAt.toISOString() },
    );
    this.name = 'GenericComboExpiredError';
  }
}

/**
 * Error khi fetch item data thất bại
 */
export class GenericComboItemFetchError extends GenericComboError {
  constructor(itemId: string, cause?: Error) {
    super(`Failed to fetch item ${itemId}`, 'GENERIC_COMBO_ITEM_FETCH_ERROR', {
      itemId,
      cause: cause?.message,
    });
    this.name = 'GenericComboItemFetchError';
  }
}
