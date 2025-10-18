import { isValidUuid } from '@/utils/validation/isValidUuid';

describe('isValidUuid', () => {
  it('should return true for a valid UUID', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('d55a0f7d-9d5b-4c8e-ae7a-ba4b5e49701c')).toBe(true);
  });

  it('should return false for an invalid UUID', () => {
    expect(isValidUuid('invalid-uuid')).toBe(false);
    expect(isValidUuid('12345')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400-')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400)')).toBe(false);
    expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740001')).toBe(false);
  });
});
