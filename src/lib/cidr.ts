// Pure IPv4 CIDR math behind /subnetting-cidr/ -- no DOM, so it's
// directly unit-testable (see cidr.test.ts) and importable by the page.
// Reused from the pre-raze src/scripts/tools/cidr.js (git history
// fa7bf4e) rather than rewritten -- it already correctly handles the
// `<<32` JS-shift-is-a-no-op gotcha and the /31-/32 point-to-point
// (RFC 3021) edge case.

export function ipToInt(octets: number[]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function parse(value: string): { ip: number; prefix: number } | null {
  const m = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return null;
  const octets = m.slice(1, 5).map(Number);
  const prefix = Number(m[5]);
  if (octets.some((o) => o > 255) || prefix > 32) return null;
  return { ip: ipToInt(octets), prefix };
}

export interface CidrResult {
  prefix: number;
  ip: number;
  network: string; broadcast: string; netmask: string; wildcard: string;
  first: string; last: string; total: number; usable: number;
}

export function computeCidr(value: string): CidrResult | null {
  const parsed = parse(value);
  if (!parsed) return null;
  const { ip, prefix } = parsed;
  // `<< 32` is a no-op in JS (shift amounts mask to 5 bits), so /0 needs
  // its own branch rather than falling out of the general formula.
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const wildcard = ~mask >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 and /32 have no reserved network/broadcast (RFC 3021) — every
  // address in the range is usable.
  const pointToPoint = prefix >= 31;
  const usable = pointToPoint ? total : Math.max(0, total - 2);
  const first = pointToPoint ? network : (network + 1) >>> 0;
  const last = pointToPoint ? broadcast : (broadcast - 1) >>> 0;
  return {
    prefix, ip,
    network: intToIp(network), broadcast: intToIp(broadcast), netmask: intToIp(mask),
    wildcard: intToIp(wildcard), first: intToIp(first), last: intToIp(last),
    total, usable,
  };
}
