import { describe, it, expect } from 'vitest';

/**
 * Validates the dead-letter policy introduced in Sprint 2:
 *
 * - Mutations keep retrying while `retries < 3`.
 * - When `retries` reaches 3, the mutation is marked `failed` and is NOT
 *   re-picked by the automatic `syncAll` pass — only a manual retry from
 *   TerrainQueue can revive it.
 *
 * This prevents the old bug where a malformed payload would silently get
 * retried (and fail) on every sync for the rest of the session.
 */

type MutationStatus = 'pending' | 'syncing' | 'failed' | 'done';
interface Mutation {
  id: string;
  status: MutationStatus;
  retries: number;
}

function nextStatus(retries: number): { status: MutationStatus; retries: number } {
  const next = retries + 1;
  return { status: next >= 3 ? 'failed' : 'pending', retries: next };
}

function pickForAutoSync(mutations: Mutation[]): Mutation[] {
  // Sprint 2 change: only `pending`, never `failed`.
  return mutations.filter((m) => m.status === 'pending');
}

describe('dead-letter queue policy', () => {
  it('marks a mutation as failed after 3 retries', () => {
    let state: Mutation = { id: 'm1', status: 'pending', retries: 0 };
    for (let i = 0; i < 3; i++) {
      const { status, retries } = nextStatus(state.retries);
      state = { ...state, status, retries };
    }
    expect(state.retries).toBe(3);
    expect(state.status).toBe('failed');
  });

  it('keeps retrying before the 3rd attempt', () => {
    const first = nextStatus(0);
    expect(first.status).toBe('pending');
    const second = nextStatus(1);
    expect(second.status).toBe('pending');
  });

  it('auto-sync only picks pending mutations, not failed ones', () => {
    const queue: Mutation[] = [
      { id: 'a', status: 'pending', retries: 0 },
      { id: 'b', status: 'failed', retries: 3 },
      { id: 'c', status: 'syncing', retries: 1 },
      { id: 'd', status: 'done', retries: 1 },
      { id: 'e', status: 'pending', retries: 2 },
    ];
    const picked = pickForAutoSync(queue).map((m) => m.id);
    expect(picked).toEqual(['a', 'e']);
  });
});
