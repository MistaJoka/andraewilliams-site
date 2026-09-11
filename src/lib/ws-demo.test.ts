import { describe, it, expect } from 'vitest';
import { runConnectionDemo } from './ws-demo';

describe('runConnectionDemo', () => {
  it('websocket: the client sends exactly 1 message (the initial connection)', () => {
    const r = runConnectionDemo('websocket');
    expect(r.clientMessagesSent).toBe(1);
    expect(r.steps.filter((s) => s.actor === 'client')).toHaveLength(2);
  });

  it('websocket: the server pushes the update without a matching client request', () => {
    const r = runConnectionDemo('websocket');
    const pushIndex = r.steps.findIndex((s) => s.text.includes('pushes it'));
    expect(pushIndex).toBeGreaterThan(-1);
    expect(r.steps[pushIndex].actor).toBe('server');
  });

  it('http-polling: the client sends multiple repeated requests', () => {
    const r = runConnectionDemo('http-polling');
    expect(r.clientMessagesSent).toBeGreaterThan(1);
    expect(r.steps.filter((s) => s.actor === 'client')).toHaveLength(r.clientMessagesSent);
  });

  it('http-polling: eventually gets the same update the websocket run gets', () => {
    const r = runConnectionDemo('http-polling');
    expect(r.steps[r.steps.length - 1].text.toLowerCase()).toContain('here it is');
  });

  it('websocket sends far fewer client messages than polling for the same outcome', () => {
    const ws = runConnectionDemo('websocket');
    const poll = runConnectionDemo('http-polling');
    expect(ws.clientMessagesSent).toBeLessThan(poll.clientMessagesSent);
  });
});
