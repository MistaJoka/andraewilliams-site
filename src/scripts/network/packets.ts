// Animates a packet dot on top of whatever render.ts already drew for the
// current scene — never touches layout, only overlays a moving <circle>
// and highlight classes on the existing nodes/edges. Movement is a plain
// CSS transition on cx/cy, not a requestAnimationFrame loop: it rides the
// site's global `prefers-reduced-motion` rule in base.css for free (the
// same rule .net-svg's fade-in already relies on), so no matchMedia
// branching is needed here at all.
//
// Sequencing between steps is a plain setTimeout delay, not
// `transitionend`: a same-position "cache hit" step never fires a
// transition at all, and cancellation needs a timeout fallback regardless
// — so the timeout is the real mechanism, not an optimization on top of
// one. Because that JS pacing is decoupled from the CSS move duration,
// reduced-motion collapses the visible motion to instant while the
// caption cadence stays readable.
import type { NetScene } from './scenes';

export interface PacketStep {
  from: string;
  to: string;
  /** `from === to`: a local "pulse", no travel — a cache hit, or arrival. */
  caption: string;
}

export interface PacketSequence {
  sceneId: string;
  /** Trigger button's idle label, e.g. "Watch the DNS lookup". */
  label: string;
  /** Used only for the post-playback "Replay: {title}" button label. */
  title: string;
  steps: PacketStep[];
  /** Present only where a cached/repeat-visit shortcut makes sense. */
  cachedSteps?: PacketStep[];
  /** Node ids to mark visually "compromised" once this sequence finishes
   *  (e.g. an attacker's forged reply succeeding) — cleared by mount.ts's
   *  stopPlayback() on the next interaction. */
  compromises?: string[];
}

export interface PlaybackHandle {
  /** Resolves once every step (including its post-arrival hold) has played. */
  done: Promise<void>;
  /** Safe to call at any time, including after done has resolved. */
  cancel(): void;
}

const STEP_MOVE_MS = 500;
const STEP_HOLD_MS = 700;
const PULSE_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SEQUENCES: Record<string, PacketSequence> = {
  l4: {
    sceneId: 'l4',
    label: 'Watch the DNS lookup',
    title: 'DNS lookup',
    steps: [
      { from: 'browser', to: 'dns', caption: "Your browser asks: what's the IP address for this domain?" },
      { from: 'dns', to: 'browser', caption: 'DNS replies with the address, plus a TTL saying how long the browser may remember it.' },
      { from: 'browser', to: 'webserver', caption: 'Now your browser can actually connect, using the IP it just learned.' },
    ],
    cachedSteps: [
      { from: 'browser', to: 'browser', caption: "Already in the OS's local DNS cache — the last lookup's TTL hasn't expired yet." },
      { from: 'browser', to: 'webserver', caption: 'No lookup needed. Your browser connects immediately with the cached address.' },
    ],
  },
  l3: {
    sceneId: 'l3',
    label: 'Watch the TCP handshake',
    title: 'TCP 3-way handshake',
    steps: [
      { from: 'device-src', to: 'device-dst', caption: 'SYN — Your Device: "I\'d like to open a connection."' },
      { from: 'device-dst', to: 'device-src', caption: 'SYN-ACK — Web Server: "Got it. I\'d like the same, back."' },
      { from: 'device-src', to: 'device-dst', caption: 'ACK — Your Device confirms. The connection is open — no request data has moved yet.' },
    ],
  },
  l2: {
    sceneId: 'l2',
    label: 'Watch a packet hop through routers',
    title: 'Router hops',
    steps: [
      { from: 'router1', to: 'router2', caption: 'Hop 1 — Your Router reads the destination address and forwards it toward the next router.' },
      { from: 'router2', to: 'router3', caption: "Hop 2 — your ISP's router does the exact same thing: check the table, forward, repeat." },
      { from: 'router3', to: 'router3', caption: 'Real paths often run ten hops or more — but eventually one of these routers IS the destination network, and delivers the packet.' },
    ],
  },
  l1: {
    sceneId: 'l1',
    label: 'Watch ARP resolve',
    title: 'ARP resolution',
    steps: [
      { from: 'arp-asker', to: 'arp-target', caption: 'Broadcast — Your Laptop asks the whole segment: "Who has this address?"' },
      { from: 'arp-target', to: 'arp-asker', caption: 'Only Your Router answers: "That\'s me — here\'s my MAC address."' },
    ],
    cachedSteps: [
      { from: 'arp-asker', to: 'arp-asker', caption: 'Already in the ARP cache from a previous lookup — no broadcast needed.' },
    ],
  },
};

// A separate table from SEQUENCES, not a third field on it: caching is a
// mode of the same normal flow, spoofing is a categorically different
// scenario. Named generically (not e.g. SPOOF_SEQUENCES) since the
// capstone this pays off explicitly notes the same trick works at other
// layers — a future round adding a second attack sequence elsewhere
// shouldn't need a rename.
export const MITM_SEQUENCES: Record<string, PacketSequence> = {
  l1: {
    sceneId: 'l1',
    label: '⚠ See it get spoofed',
    title: 'ARP spoofing',
    steps: [
      { from: 'arp-asker', to: 'arp-target', caption: 'Broadcast — Your Laptop asks the whole segment: "Who has this address?"' },
      {
        from: 'attacker',
        to: 'arp-asker',
        caption:
          'The Attacker answers first: "That\'s me — here\'s my MAC address." Your Laptop has no way to tell this reply is a lie.',
      },
      {
        from: 'attacker',
        to: 'attacker',
        caption:
          'From now on, traffic Your Laptop thinks is going to Your Router really goes through the Attacker first. This same trick works at almost every layer — see below.',
      },
    ],
    compromises: ['arp-asker', 'attacker'],
  },
};

export function playSequence(
  svg: SVGSVGElement,
  scene: NetScene,
  sequence: PacketSequence,
  useCached: boolean,
  onStep: (step: PacketStep, index: number, total: number) => void,
): PlaybackHandle {
  const steps = useCached && sequence.cachedSteps ? sequence.cachedSteps : sequence.steps;
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));

  let cancelled = false;
  let activeEls: Element[] = [];

  const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  packet.setAttribute('class', 'net-packet');
  packet.setAttribute('aria-hidden', 'true');
  packet.setAttribute('r', '5');
  // Set inline rather than in the stylesheet so STEP_MOVE_MS is the one
  // place this duration is defined. The site's reduced-motion rule in
  // base.css uses `!important`, which still overrides this — inline
  // styles only outrank stylesheet rules of equal (non-!important)
  // weight.
  packet.style.transitionProperty = 'cx, cy';
  packet.style.transitionDuration = `${STEP_MOVE_MS}ms`;
  packet.style.transitionTimingFunction = 'ease-in-out';
  svg.appendChild(packet);

  const edgeEl = (a: string, b: string) =>
    svg.querySelector(`[data-from="${a}"][data-to="${b}"]`) ?? svg.querySelector(`[data-from="${b}"][data-to="${a}"]`);
  const nodeEl = (id: string) => svg.querySelector(`[data-node-id="${id}"]`);

  const clearActive = () => {
    for (const el of activeEls) el.classList.remove('is-active', 'net-node--active', 'net-node--pulse');
    activeEls = [];
  };
  const cleanup = () => {
    clearActive();
    packet.remove();
  };

  const done = (async () => {
    for (let i = 0; i < steps.length; i++) {
      if (cancelled) return;
      const step = steps[i]!;
      clearActive();
      onStep(step, i, steps.length);

      const fromNode = byId.get(step.from);
      const toNode = byId.get(step.to);
      if (!fromNode || !toNode) continue;

      packet.setAttribute('cx', String(fromNode.x));
      packet.setAttribute('cy', String(fromNode.y));

      if (step.from === step.to) {
        const g = nodeEl(step.from);
        if (g) {
          g.classList.add('net-node--pulse');
          activeEls.push(g);
        }
        await delay(PULSE_MS);
      } else {
        const edge = edgeEl(step.from, step.to);
        const fromEl = nodeEl(step.from);
        const toEl = nodeEl(step.to);
        if (edge) {
          edge.classList.add('is-active');
          activeEls.push(edge);
        }
        if (fromEl) {
          fromEl.classList.add('net-node--active');
          activeEls.push(fromEl);
        }
        if (toEl) {
          toEl.classList.add('net-node--active');
          activeEls.push(toEl);
        }
        // Force layout so the browser registers the start position before
        // the end position is set, or the move never transitions.
        packet.getBoundingClientRect();
        packet.setAttribute('cx', String(toNode.x));
        packet.setAttribute('cy', String(toNode.y));
        await delay(STEP_MOVE_MS);
      }

      if (cancelled) return;
      await delay(STEP_HOLD_MS);
    }
    if (!cancelled) cleanup();
  })();

  return {
    done,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      cleanup();
    },
  };
}
