// Pure logic behind /tech-stack-fundamentals/ -- no DOM, so it's
// directly unit-testable (see stack-sim.test.ts) and importable by the
// page. A genuinely real (if tiny) router + in-memory database, not a
// canned animation: an unknown route really does 404 before ever
// touching the database, and a known route with a missing id really
// does reach the database and come back empty.

export interface UserRecord { id: number; name: string; role: string; }

export const USERS: UserRecord[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
  { id: 2, name: 'Grace Hopper', role: 'Admiral' },
  { id: 3, name: 'Alan Turing', role: 'Researcher' },
];

export type Layer = 'browser' | 'server' | 'database';
export interface RequestLogEntry { layer: Layer; text: string; }
export interface RequestResult { status: number; body: unknown; log: RequestLogEntry[]; }

export function handleRequest(method: string, path: string): RequestResult {
  const log: RequestLogEntry[] = [];
  log.push({ layer: 'browser', text: `${method} ${path}` });

  const match = path.match(/^\/api\/users\/(\d+)$/);
  if (!match) {
    log.push({ layer: 'server', text: `404 — no route matches ${path}` });
    return { status: 404, body: { error: 'Not found' }, log };
  }

  const id = Number(match[1]);
  log.push({ layer: 'server', text: `Route matched: GET /api/users/:id (id=${id})` });
  log.push({ layer: 'database', text: `SELECT * FROM users WHERE id = ${id};` });

  const user = USERS.find((u) => u.id === id);
  if (!user) {
    log.push({ layer: 'database', text: '0 rows returned' });
    log.push({ layer: 'server', text: `404 — user ${id} not found` });
    return { status: 404, body: { error: 'User not found' }, log };
  }

  log.push({ layer: 'database', text: `1 row returned: ${JSON.stringify(user)}` });
  log.push({ layer: 'server', text: '200 OK — serializing response' });
  log.push({ layer: 'browser', text: 'Received 200 — rendering profile' });
  return { status: 200, body: user, log };
}
