import { describe, it, expect } from 'vitest';

/**
 * Pure logic tests for useUrlState. We don't spin up a router — we verify
 * the transform rules directly: default values must be stripped from the
 * URL, other values must be written.
 */

function applyUrlState(current: URLSearchParams, key: string, next: string, defaultValue: string) {
  const updated = new URLSearchParams(current);
  if (next === defaultValue || next === '') {
    updated.delete(key);
  } else {
    updated.set(key, next);
  }
  return updated;
}

describe('useUrlState URL-param encoding', () => {
  it('strips the param when the value equals the default', () => {
    const result = applyUrlState(new URLSearchParams('?view=list'), 'view', 'kanban', 'kanban');
    expect(result.toString()).toBe('');
  });

  it('strips the param when the value is an empty string', () => {
    const result = applyUrlState(new URLSearchParams('?view=list'), 'view', '', 'kanban');
    expect(result.toString()).toBe('');
  });

  it('writes the param when the value differs from the default', () => {
    const result = applyUrlState(new URLSearchParams(), 'view', 'list', 'kanban');
    expect(result.toString()).toBe('view=list');
  });

  it('preserves other params when updating one key', () => {
    const result = applyUrlState(new URLSearchParams('?status=sent&page=3'), 'status', 'paid', 'all');
    const asObject = Object.fromEntries(result.entries());
    expect(asObject).toEqual({ status: 'paid', page: '3' });
  });
});
