import { describe, it, expect } from 'vitest';
import { createApiSim, STATUS_FAMILIES } from './api-basics';

describe('createApiSim', () => {
  it('GET /todos lists the seeded todos', () => {
    const api = createApiSim();
    const r = api.request('GET', '/todos');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
  });

  it('GET /todos/:id returns the matching todo', () => {
    const api = createApiSim();
    const r = api.request('GET', '/todos/1');
    expect(r.status).toBe(200);
    expect((r.body as { title: string }).title).toMatch(/API fundamentals/);
  });

  it('GET /todos/:id 404s for an id that was never real', () => {
    const api = createApiSim();
    const r = api.request('GET', '/todos/999');
    expect(r.status).toBe(404);
  });

  it('POST /todos with a valid title creates a real row GET can then see', () => {
    const api = createApiSim();
    const created = api.request('POST', '/todos', { title: 'A new one' });
    expect(created.status).toBe(201);
    const id = (created.body as { id: number }).id;
    const fetched = api.request('GET', `/todos/${id}`);
    expect(fetched.status).toBe(200);
    expect((fetched.body as { title: string }).title).toBe('A new one');
  });

  it('POST /todos with no title 400s before touching anything', () => {
    const api = createApiSim();
    const before = (api.request('GET', '/todos').body as unknown[]).length;
    const r = api.request('POST', '/todos', {});
    expect(r.status).toBe(400);
    const after = (api.request('GET', '/todos').body as unknown[]).length;
    expect(after).toBe(before);
  });

  it('PUT /todos/:id updates an existing todo', () => {
    const api = createApiSim();
    const r = api.request('PUT', '/todos/2', { done: false });
    expect(r.status).toBe(200);
    expect((r.body as { done: boolean }).done).toBe(false);
  });

  it('PUT /todos/:id 404s for a missing id', () => {
    const api = createApiSim();
    const r = api.request('PUT', '/todos/999', { title: 'nope' });
    expect(r.status).toBe(404);
  });

  it('DELETE /todos/:id removes it, and a second delete 404s', () => {
    const api = createApiSim();
    const first = api.request('DELETE', '/todos/1');
    expect(first.status).toBe(204);
    const second = api.request('DELETE', '/todos/1');
    expect(second.status).toBe(404);
  });

  it('an unmatched route 404s with a real error message', () => {
    const api = createApiSim();
    const r = api.request('PATCH', '/nonsense');
    expect(r.status).toBe(404);
    expect((r.body as { error: string }).error).toContain('PATCH /nonsense');
  });

  it('two instances never share state', () => {
    const a = createApiSim();
    const b = createApiSim();
    a.request('POST', '/todos', { title: 'only in a' });
    expect((b.request('GET', '/todos').body as unknown[])).toHaveLength(2);
  });
});

describe('STATUS_FAMILIES', () => {
  it('covers 2xx, 4xx, and 5xx', () => {
    expect(STATUS_FAMILIES.map((f) => f.range)).toEqual(['2xx', '4xx', '5xx']);
  });

  it('every family has a non-empty meaning and example', () => {
    for (const family of STATUS_FAMILIES) {
      expect(family.meaning.length).toBeGreaterThan(0);
      expect(family.example.length).toBeGreaterThan(0);
    }
  });
});
