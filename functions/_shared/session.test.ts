import { describe, expect, it } from 'vitest';
import { createSessionToken, readSessionToken } from './session';

describe('signed sessions', () => {
  it('round-trips a valid signed session', async () => {
    const token = await createSessionToken(
      { username: 'xinyu', role: '用户' },
      'a-secret-long-enough-for-tests',
      1_800_000_000,
    );
    await expect(
      readSessionToken(token, 'a-secret-long-enough-for-tests', 1_800_000_001),
    ).resolves.toMatchObject({ username: 'xinyu', role: '用户' });
  });

  it('rejects a tampered token', async () => {
    const token = await createSessionToken(
      { username: 'xinyu', role: '用户' },
      'a-secret-long-enough-for-tests',
      1_800_000_000,
    );
    await expect(
      readSessionToken(`${token.slice(0, -1)}x`, 'a-secret-long-enough-for-tests', 1_800_000_001),
    ).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await createSessionToken(
      { username: 'xinyu', role: '用户' },
      'a-secret-long-enough-for-tests',
      1_700_000_000,
      10,
    );
    await expect(
      readSessionToken(token, 'a-secret-long-enough-for-tests', 1_700_000_011),
    ).resolves.toBeNull();
  });
});
