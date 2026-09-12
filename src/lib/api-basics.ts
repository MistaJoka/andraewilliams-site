// Pure logic behind /api-fundamentals/ -- a genuinely real (if tiny)
// in-memory REST API, not a canned animation: POST really adds a row
// GET can then see, DELETE really removes it, and a malformed body
// really gets a 400 before anything is touched. No DOM, so it's
// directly unit-testable (see api-basics.test.ts) and importable by
// the page.

export interface Todo { id: number; title: string; done: boolean; }
export interface ApiResponse { status: number; body: unknown; }

const ITEM_PATH = /^\/todos\/(\d+)$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A factory, not module-level state -- every call gets its own todos
// list, so a test (or a "Reset" button) never inherits another run's
// mutations.
export function createApiSim() {
  const todos: Todo[] = [
    { id: 1, title: 'Write the API fundamentals page', done: false },
    { id: 2, title: 'Ship it', done: true },
  ];
  let nextId = 3;

  function request(method: string, path: string, body?: unknown): ApiResponse {
    const itemMatch = path.match(ITEM_PATH);

    if (method === 'GET' && path === '/todos') {
      return { status: 200, body: todos };
    }
    if (method === 'GET' && itemMatch) {
      const todo = todos.find((t) => t.id === Number(itemMatch[1]));
      return todo ? { status: 200, body: todo } : { status: 404, body: { error: 'Not found' } };
    }
    if (method === 'POST' && path === '/todos') {
      if (!isPlainObject(body) || typeof body.title !== 'string' || !body.title.trim()) {
        return { status: 400, body: { error: 'title is required' } };
      }
      const todo: Todo = { id: nextId++, title: body.title, done: false };
      todos.push(todo);
      return { status: 201, body: todo };
    }
    if (method === 'PUT' && itemMatch) {
      const todo = todos.find((t) => t.id === Number(itemMatch[1]));
      if (!todo) return { status: 404, body: { error: 'Not found' } };
      if (!isPlainObject(body)) return { status: 400, body: { error: 'body must be a JSON object' } };
      if ('title' in body) todo.title = String(body.title);
      if ('done' in body) todo.done = Boolean(body.done);
      return { status: 200, body: todo };
    }
    if (method === 'DELETE' && itemMatch) {
      const idx = todos.findIndex((t) => t.id === Number(itemMatch[1]));
      if (idx === -1) return { status: 404, body: { error: 'Not found' } };
      todos.splice(idx, 1);
      return { status: 204, body: null };
    }

    return { status: 404, body: { error: `No route matches ${method} ${path}` } };
  }

  return { request, todos };
}

// One shared status-code reference, driving both the Status Code step's
// copy and (if ever needed) any future lookup -- a single source of
// truth rather than a number restated in prose in two places.
export interface StatusFamily { range: string; name: string; meaning: string; example: string; }

export const STATUS_FAMILIES: StatusFamily[] = [
  { range: '2xx', name: 'Success', meaning: 'The request was received, understood, and acted on.', example: '201 Created — POST /todos just made a new one.' },
  { range: '4xx', name: 'Client error', meaning: 'The request itself was the problem -- bad input, wrong path, no permission.', example: '404 Not Found — that id was never real.' },
  { range: '5xx', name: 'Server error', meaning: "The request was fine; the server broke while handling it.", example: '500 Internal Server Error — a bug on their end, not yours.' },
];
