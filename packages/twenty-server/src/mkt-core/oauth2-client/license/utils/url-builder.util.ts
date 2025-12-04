/**
 * Replace path parameters in URL template
 * @example replacePathParams('/api/licenses/:id', { id: '123' }) => '/api/licenses/123'
 */
export const replacePathParams = (
  path: string,
  params: Record<string, string | number>,
): string => {
  let result = path;

  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value));
  }

  return result;
};

/**
 * Join base URL and path, ensuring proper slash handling
 * @example joinUrlPath('https://api.example.com/', '/licenses') => 'https://api.example.com/licenses'
 */
export const joinUrlPath = (baseUrl: string, path: string): string => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

/**
 * Build full URL with base, path, and optional path params
 * @example buildFullUrl('https://api.example.com', '/licenses/:id', { id: '123' })
 *          => 'https://api.example.com/licenses/123'
 */
export const buildFullUrl = (
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>,
): string => {
  const processedPath = params ? replacePathParams(path, params) : path;

  return joinUrlPath(baseUrl, processedPath);
};

/**
 * Build query string from params object
 * @example buildQueryString({ page: 1, limit: 10 }) => 'page=1&limit=10'
 */
export const buildQueryString = (
  params: Record<string, string | number | boolean | undefined>,
): string => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
};

/**
 * Build full URL with query string
 * @example buildUrlWithQuery('https://api.example.com/licenses', { page: 1, limit: 10 })
 *          => 'https://api.example.com/licenses?page=1&limit=10'
 */
export const buildUrlWithQuery = (
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): string => {
  if (!params) {
    return url;
  }

  const queryString = buildQueryString(params);

  if (!queryString) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}${queryString}`;
};
