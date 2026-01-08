/**
 * Shared error utilities for mkt-product-integration module
 */

/**
 * Extract error message from unknown error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

/**
 * Check if error is a network/connection error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const networkErrorPatterns = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'Network Error',
      'fetch failed',
    ];

    return networkErrorPatterns.some((pattern) =>
      error.message.includes(pattern),
    );
  }

  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const authErrorPatterns = ['401', 'Unauthorized', 'Token expired'];

    return authErrorPatterns.some((pattern) => error.message.includes(pattern));
  }

  return false;
};
