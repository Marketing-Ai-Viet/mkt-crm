/**
 * URL Builder utilities for mkt-product-integration module
 */

/**
 * Build URL with path parameters replacement
 * @example
 * buildUrl('/api/products/:id', { id: '123' }, 'https://api.example.com')
 * // => 'https://api.example.com/api/products/123'
 */
export const buildUrl = (
  path: string,
  params?: Record<string, string | number>,
  baseUrl = '',
): string => {
  let processedPath = path;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      processedPath = processedPath.replace(`:${key}`, String(value));
    }
  }

  return `${baseUrl}${processedPath}`;
};

/**
 * Build query string from params object
 */
export const buildQueryString = (
  params: Record<string, string | number | boolean | undefined>,
): string => {
  const filtered = Object.entries(params).filter(
    ([, value]) => value !== undefined,
  );

  if (filtered.length === 0) {
    return '';
  }

  const queryParts = filtered.map(
    ([key, value]) =>
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );

  return `?${queryParts.join('&')}`;
};
