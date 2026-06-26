import { describe, expect, it } from 'vitest';
import { registerSchema } from './schemas.js';

describe('register schema', () => {
  it('rejects weak password', () => {
    const result = registerSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'test@example.com',
      password: 'weak'
    });

    expect(result.success).toBe(false);
  });

  it('accepts strong password', () => {
    const result = registerSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'test@example.com',
      password: 'Strong!Password123'
    });

    expect(result.success).toBe(true);
  });
});
