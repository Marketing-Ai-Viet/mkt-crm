/**
 * Get nested property value from object by path
 * Hỗ trợ nested path: 'customer.name', 'address.city'
 *
 * @param obj - Source object
 * @param path - Property path (e.g., 'customer.name', 'address.city')
 * @returns Value at path or undefined if not found
 */
export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string,
): unknown => {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return result;
};
