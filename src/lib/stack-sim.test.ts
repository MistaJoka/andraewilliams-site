import { describe, it, expect } from 'vitest';
import { handleRequest, USERS } from './stack-sim';

describe('handleRequest', () => {
  it('returns a full success trace through browser -> server -> database -> browser', () => {
    const r = handleRequest('GET', '/api/users/2');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(USERS.find((u) => u.id === 2));
    expect(r.log.map((l) => l.layer)).toEqual(['browser', 'server', 'database', 'database', 'server', 'browser']);
  });

  it('reaches the database for a valid route with a missing id, and gets 0 rows', () => {
    const r = handleRequest('GET', '/api/users/99');
    expect(r.status).toBe(404);
    expect(r.log.some((l) => l.layer === 'database' && l.text.includes('0 rows'))).toBe(true);
  });

  it('never reaches the database for a route that does not match at all', () => {
    const r = handleRequest('GET', '/api/nonsense');
    expect(r.status).toBe(404);
    expect(r.log.some((l) => l.layer === 'database')).toBe(false);
    expect(r.log).toHaveLength(2);
  });

  it('every valid user id resolves to that exact user', () => {
    for (const user of USERS) {
      const r = handleRequest('GET', `/api/users/${user.id}`);
      expect(r.status).toBe(200);
      expect(r.body).toEqual(user);
    }
  });
});
