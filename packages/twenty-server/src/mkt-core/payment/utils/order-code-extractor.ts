import sortBy from 'lodash.sortby';

// ============================================
// TYPES
// ============================================

/**
 * Order code pattern definition
 */
export type OrderCodePattern = {
  /** Pattern name for identification */
  name: string;
  /** Regex pattern to match */
  regex: RegExp;
  /** Priority (lower = higher priority) */
  priority: number;
};

/**
 * Extraction result with pattern info
 */
export type ExtractedCode = {
  code: string;
  pattern: string;
};

// ============================================
// DEFAULT PATTERNS
// ============================================

/**
 * Default order code patterns
 * Sorted by priority (lower number = higher priority)
 */
const DEFAULT_PATTERNS: OrderCodePattern[] = [
  {
    name: 'ORD_PATTERN',
    regex: /ORD\d{8,14}/i,
    priority: 1,
  },
  {
    name: 'DH_PATTERN',
    regex: /DH\d{6,14}/i,
    priority: 2,
  },
  {
    name: 'MKT_PATTERN',
    regex: /MKT\d{6,14}/i,
    priority: 3,
  },
  {
    name: 'INVOICE_PATTERN',
    regex: /INV\d{6,14}/i,
    priority: 4,
  },
];

// ============================================
// ORDER CODE EXTRACTOR
// ============================================

/**
 * Order Code Extractor Utility
 *
 * Extracts order codes from transaction content using configurable patterns.
 * Useful when SEPay webhook `code` field is null but order code exists in `content`.
 *
 * @example
 * ```typescript
 * // Using singleton instance
 * const code = orderCodeExtractor.extract('NGUYEN VAN A chuyen tien ORD20251221001');
 * // Returns: 'ORD20251221001'
 *
 * // Using custom patterns
 * const extractor = new OrderCodeExtractor([
 *   { name: 'CUSTOM', regex: /MYORD\d{6}/, priority: 1 }
 * ]);
 * const code = extractor.extract('Payment for MYORD123456');
 * // Returns: 'MYORD123456'
 * ```
 */
export class OrderCodeExtractor {
  private readonly patterns: OrderCodePattern[];

  constructor(customPatterns?: OrderCodePattern[]) {
    this.patterns = sortBy(customPatterns ?? DEFAULT_PATTERNS, 'priority');
  }

  /**
   * Extract order code from content string
   *
   * @param content - Transaction content/description
   * @returns Extracted order code or null if not found
   */
  extract(content: string | null | undefined): string | null {
    if (!content || typeof content !== 'string') {
      return null;
    }

    const normalizedContent = this.normalizeContent(content);

    for (const pattern of this.patterns) {
      const match = normalizedContent.match(pattern.regex);

      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Extract all matching codes from content
   *
   * @param content - Transaction content/description
   * @returns Array of extracted codes with pattern info
   */
  extractAll(content: string | null | undefined): ExtractedCode[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const normalizedContent = this.normalizeContent(content);
    const results: ExtractedCode[] = [];

    for (const pattern of this.patterns) {
      const globalRegex = new RegExp(pattern.regex.source, 'gi');
      const matches = normalizedContent.matchAll(globalRegex);

      for (const match of matches) {
        results.push({
          code: match[0],
          pattern: pattern.name,
        });
      }
    }

    return results;
  }

  /**
   * Validate if a string is a valid order code
   *
   * @param code - Code to validate
   * @returns true if code matches any pattern
   */
  isValidOrderCode(code: string | null | undefined): boolean {
    if (!code) {
      return false;
    }

    return this.patterns.some((pattern) => pattern.regex.test(code));
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): ReadonlyArray<OrderCodePattern> {
    return this.patterns;
  }

  /**
   * Normalize content for pattern matching
   * - Convert to uppercase
   * - Remove extra whitespace
   * - Trim
   */
  private normalizeContent(content: string): string {
    return content.toUpperCase().replace(/\s+/g, ' ').trim();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Singleton instance with default patterns
 * Use this for most common cases
 */
export const orderCodeExtractor = new OrderCodeExtractor();
