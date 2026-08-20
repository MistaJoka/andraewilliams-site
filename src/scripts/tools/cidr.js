// Pure IPv4 CIDR/subnet math — no DOM. Kept separate from the Astro
// component so the calculation is testable independent of markup.

function ipToInt(octets) {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function parse(value) {
  const m = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return null;
  const octets = m.slice(1, 5).map(Number);
  const prefix = Number(m[5]);
  if (octets.some((o) => o > 255) || prefix > 32) return null;
  return { ip: ipToInt(octets), prefix };
}

/**
 * Returns an array of [label, value] rows for the given "a.b.c.d/n" input,
 * or null if it isn't a valid IPv4 CIDR.
 */
export function computeCidr(value) {
  const parsed = parse(value);
  if (!parsed) return null;
  const { ip, prefix } = parsed;

  // `<< 32` is a no-op in JS (shift amounts are masked to 5 bits), so /0
  // needs its own branch rather than falling out of the general formula.
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const wildcard = ~mask >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 and /32 have no network/broadcast reserved (RFC 3021, point-to-point
  // and host routes) — every address in the range is usable.
  const pointToPoint = prefix >= 31;
  const usable = pointToPoint ? total : Math.max(0, total - 2);
  const first = pointToPoint ? network : (network + 1) >>> 0;
  const last = pointToPoint ? broadcast : (broadcast - 1) >>> 0;

  return [
    ['Network', intToIp(network)],
    ['Broadcast', intToIp(broadcast)],
    ['Netmask', intToIp(mask)],
    ['Wildcard', intToIp(wildcard)],
    ['First usable', intToIp(first)],
    ['Last usable', intToIp(last)],
    ['Total addresses', total.toLocaleString('en-US')],
    ['Usable hosts', usable.toLocaleString('en-US')],
  ];
}
