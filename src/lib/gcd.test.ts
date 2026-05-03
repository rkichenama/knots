import { describe, it, expect } from 'vitest';
import gcd from './gcd';

describe('gcd', () => {
  it('returns x when y is 0', () => {
    expect(gcd(6, 0)).toBe(6);
  });

  it('returns y when x is 0', () => {
    expect(gcd(0, 5)).toBe(5);
  });

  it('computes gcd of two coprime numbers', () => {
    expect(gcd(5, 6)).toBe(1);
  });

  it('computes gcd of two numbers with common factor', () => {
    expect(gcd(12, 8)).toBe(4);
  });

  it('computes gcd when first arg is larger', () => {
    expect(gcd(48, 18)).toBe(6);
  });

  it('computes gcd when second arg is larger', () => {
    expect(gcd(18, 48)).toBe(6);
  });

  it('returns the number itself when both args are equal', () => {
    expect(gcd(7, 7)).toBe(7);
  });
});
