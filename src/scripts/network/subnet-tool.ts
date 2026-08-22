// The subnetting mini-tool embedded in the L2 scene's detail panel — the
// source video transcript's own advice for this exact topic ("get the
// concept first... understand what changing the prefix length actually
// does... once the concept is solid the binary math clicks naturally").
// Deliberately carries no real IP address anywhere: /tools/cidr/ already
// exists as the practitioner calculator for real addresses, and rebuilding
// address parsing next to it would be pure duplication for zero
// conceptual gain — prefix-length behavior is general, it doesn't need a
// real address to demonstrate. This tool answers "why does the split
// change," the calculator answers "what IS the split for this address."
const MIN_PREFIX = 8;
const MAX_PREFIX = 30;
const DEFAULT_PREFIX = 24;

export interface SubnetStats {
  networkBits: number;
  hostBits: number;
  usableHosts: number;
}

export function subnetStats(prefix: number): SubnetStats {
  const hostBits = 32 - prefix;
  return { networkBits: prefix, hostBits, usableHosts: Math.max(0, 2 ** hostBits - 2) };
}

let instanceCounter = 0;

export function buildSubnetTool(): HTMLElement {
  const id = `subnet-prefix-${instanceCounter++}`;

  const root = document.createElement('div');
  root.className = 'subnet-tool';

  const field = document.createElement('label');
  field.className = 'subnet-tool-field';
  const fieldLabel = document.createElement('span');
  fieldLabel.textContent = 'Prefix length';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(MIN_PREFIX);
  input.max = String(MAX_PREFIX);
  input.value = String(DEFAULT_PREFIX);
  input.id = id;
  const output = document.createElement('output');
  output.setAttribute('for', id);
  field.append(fieldLabel, input, output);

  // 32 boxes grouped 4x8, echoing dotted-decimal octets — purely by
  // grouping, not by printing anything that looks like a real address.
  // Decorative: the values that matter are in the <dl> below, which is
  // what a screen reader user and the native range-input announcement
  // both already cover.
  const bits = document.createElement('div');
  bits.className = 'subnet-bits';
  bits.setAttribute('aria-hidden', 'true');
  const bitEls: HTMLElement[] = [];
  for (let octet = 0; octet < 4; octet++) {
    const group = document.createElement('div');
    group.className = 'subnet-octet';
    for (let b = 0; b < 8; b++) {
      const bit = document.createElement('span');
      bit.className = 'subnet-bit';
      group.append(bit);
      bitEls.push(bit);
    }
    bits.append(group);
  }

  const stats = document.createElement('dl');
  stats.className = 'subnet-stats';
  const netDt = document.createElement('dt');
  netDt.textContent = 'Network bits';
  const netDd = document.createElement('dd');
  const hostDt = document.createElement('dt');
  hostDt.textContent = 'Host bits';
  const hostDd = document.createElement('dd');
  const usableDt = document.createElement('dt');
  usableDt.textContent = 'Usable hosts';
  const usableDd = document.createElement('dd');
  stats.append(netDt, netDd, hostDt, hostDd, usableDt, usableDd);

  const link = document.createElement('p');
  link.className = 'subnet-link';
  const a = document.createElement('a');
  a.href = '/tools/cidr/';
  a.textContent = 'Try it with a real address → CIDR / Subnet Calculator';
  link.append(a);

  const render = () => {
    const prefix = Number(input.value);
    output.textContent = `/${prefix}`;
    bitEls.forEach((bit, i) => {
      bit.classList.toggle('is-network', i < prefix);
      bit.classList.toggle('is-host', i >= prefix);
    });
    const { networkBits, hostBits, usableHosts } = subnetStats(prefix);
    netDd.textContent = String(networkBits);
    hostDd.textContent = String(hostBits);
    usableDd.textContent = usableHosts.toLocaleString();
  };
  input.addEventListener('input', render);
  render();

  root.append(field, bits, stats, link);
  return root;
}
