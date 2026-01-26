import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Order code pattern configuration
 */
export type OrderCodePatternConfig = {
  name: string;
  regex: string;
  priority: number;
};

/**
 * Complete order code configuration
 */
export type OrderCodeConfig = {
  /** Whether content parsing is enabled */
  enableContentParsing: boolean;
  /** Custom patterns (in addition to defaults) */
  customPatterns: OrderCodePatternConfig[];
};

// ============================================
// DEFAULTS
// ============================================

const ORDER_CODE_DEFAULTS = {
  ENABLE_CONTENT_PARSING: true,
} as const;

// ============================================
// ZOD VALIDATION
// ============================================

/**
 * Validate regex pattern string
 */
const regexPatternSchema = z.string().refine(
  (val) => {
    try {
      new RegExp(val);

      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid regex pattern' },
);

/**
 * Order code pattern schema
 */
const patternConfigSchema = z.object({
  name: z.string().min(1),
  regex: regexPatternSchema,
  priority: z.number().int().positive(),
});

/**
 * Environment validation schema
 */
const orderCodeEnvSchema = z.object({
  ENABLE_ORDER_CODE_PARSING: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  ORDER_CODE_PATTERN_CUSTOM: regexPatternSchema.optional(),
  ORDER_CODE_PATTERN_CUSTOM_NAME: z.string().min(1).optional(),
  ORDER_CODE_PATTERN_CUSTOM_PRIORITY: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});

type OrderCodeEnvValidation = z.infer<typeof orderCodeEnvSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

const logger = new Logger('OrderCodeConfig');

/**
 * Safe validate order code environment variables
 */
const safeValidateOrderCodeEnv = (): OrderCodeEnvValidation | null => {
  const result = orderCodeEnvSchema.safeParse({
    ENABLE_ORDER_CODE_PARSING: process.env.ENABLE_ORDER_CODE_PARSING,
    ORDER_CODE_PATTERN_CUSTOM: process.env.ORDER_CODE_PATTERN_CUSTOM,
    ORDER_CODE_PATTERN_CUSTOM_NAME: process.env.ORDER_CODE_PATTERN_CUSTOM_NAME,
    ORDER_CODE_PATTERN_CUSTOM_PRIORITY:
      process.env.ORDER_CODE_PATTERN_CUSTOM_PRIORITY,
  });

  if (!result.success) {
    logger.warn('Order code env validation failed:', result.error.message);

    return null;
  }

  return result.data;
};

// ============================================
// CONFIG BUILDER
// ============================================

/**
 * Build order code configuration with Zod validation
 */
const buildOrderCodeConfig = (): OrderCodeConfig => {
  const validated = safeValidateOrderCodeEnv();

  if (!validated) {
    return {
      enableContentParsing: ORDER_CODE_DEFAULTS.ENABLE_CONTENT_PARSING,
      customPatterns: [],
    };
  }

  const customPatterns: OrderCodePatternConfig[] = [];

  // Add custom pattern if all fields are provided
  if (validated.ORDER_CODE_PATTERN_CUSTOM) {
    const customPattern: OrderCodePatternConfig = {
      name: validated.ORDER_CODE_PATTERN_CUSTOM_NAME ?? 'CUSTOM_PATTERN',
      regex: validated.ORDER_CODE_PATTERN_CUSTOM,
      priority: validated.ORDER_CODE_PATTERN_CUSTOM_PRIORITY ?? 5,
    };

    // Validate the complete pattern
    const patternValidation = patternConfigSchema.safeParse(customPattern);

    if (patternValidation.success) {
      customPatterns.push(customPattern);
      logger.log(`Registered custom order code pattern: ${customPattern.name}`);
    } else {
      logger.warn(
        `Invalid custom pattern configuration: ${patternValidation.error.message}`,
      );
    }
  }

  return {
    enableContentParsing:
      validated.ENABLE_ORDER_CODE_PARSING ??
      ORDER_CODE_DEFAULTS.ENABLE_CONTENT_PARSING,
    customPatterns,
  };
};

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Order code configuration
 *
 * Registered with NestJS ConfigModule as 'orderCode'
 *
 * Environment variables:
 * - ENABLE_ORDER_CODE_PARSING: Enable parsing order code from content (default: true)
 * - ORDER_CODE_PATTERN_CUSTOM: Custom regex pattern (e.g., 'MYORD\\d{6}')
 * - ORDER_CODE_PATTERN_CUSTOM_NAME: Name for custom pattern (default: 'CUSTOM_PATTERN')
 * - ORDER_CODE_PATTERN_CUSTOM_PRIORITY: Priority for custom pattern (default: 5)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(orderCodeConfig.KEY)
 *   private readonly config: OrderCodeConfig,
 * ) {}
 *
 * if (this.config.enableContentParsing) {
 *   const code = orderCodeExtractor.extract(content);
 * }
 * ```
 */
export const orderCodeConfig = registerAs('orderCode', buildOrderCodeConfig);

/**
 * Config key for injection
 */
export const ORDER_CODE_CONFIG_KEY = orderCodeConfig.KEY;
