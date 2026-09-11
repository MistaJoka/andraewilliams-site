// Pure logic behind the "polling vs. WebSocket" mini-demo in the
// Server step of /tech-stack-fundamentals/ -- same shape as
// cache-demo.ts and job-queue.ts: a small, separate, tested concept
// demo, not a change to stack-sim.ts's already-verified 3-tier
// pipeline. Demonstrates a 4th "when to use what" heuristic that
// wasn't on the page at all before this: request/response works fine
// until the server needs to tell the client something without being
// asked, at which point polling wastes round trips that a persistent
// connection doesn't.
export type ConnectionType = 'http-polling' | 'websocket';

export interface ConnectionStep {
  actor: 'client' | 'server';
  text: string;
}

export interface ConnectionRun {
  steps: ConnectionStep[];
  clientMessagesSent: number;
}

export function runConnectionDemo(type: ConnectionType): ConnectionRun {
  if (type === 'websocket') {
    return {
      steps: [
        { actor: 'client', text: 'Opens one WebSocket connection' },
        { actor: 'server', text: 'Connection open — no polling needed' },
        { actor: 'server', text: 'New order arrives — pushes it immediately' },
        { actor: 'client', text: 'Receives the update the instant it happened' },
      ],
      clientMessagesSent: 1,
    };
  }
  return {
    steps: [
      { actor: 'client', text: 'Asks: "Any updates?"' },
      { actor: 'server', text: 'Not yet' },
      { actor: 'client', text: 'Asks again: "Any updates?"' },
      { actor: 'server', text: 'Not yet' },
      { actor: 'client', text: 'Asks again: "Any updates?"' },
      { actor: 'server', text: 'Not yet' },
      { actor: 'client', text: 'Asks again: "Any updates?"' },
      { actor: 'server', text: 'Yes — here it is' },
    ],
    clientMessagesSent: 4,
  };
}
