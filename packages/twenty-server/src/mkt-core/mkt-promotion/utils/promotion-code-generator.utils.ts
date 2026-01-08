import { randomBytes } from 'crypto';

const DEFAULT_COUPON_CODE_LENGTH = 8;

/**
 * Generate secure random coupon code
 */
export const generateSecureCouponCode = (
  prefix = '',
  length = DEFAULT_COUPON_CODE_LENGTH,
): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(length);
  let code = prefix;

  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
};

/**
 * Generate batch of unique coupon codes
 */
export const generateBatchCouponCodes = async (
  quantity: number,
  prefix: string,
  existingCodesChecker: (codes: string[]) => Promise<string[]>,
): Promise<string[]> => {
  const codes: string[] = [];
  const maxAttempts = quantity * 3; // Prevent infinite loop
  let attempts = 0;

  while (codes.length < quantity && attempts < maxAttempts) {
    const candidateCodes = Array.from({ length: quantity - codes.length }, () =>
      generateSecureCouponCode(prefix),
    );

    const existingCodes = await existingCodesChecker(candidateCodes);
    const newCodes = candidateCodes.filter(
      (code) => !existingCodes.includes(code),
    );

    codes.push(...newCodes);
    attempts++;
  }

  if (codes.length < quantity) {
    throw new Error('Unable to generate unique codes after max attempts');
  }

  return codes;
};
