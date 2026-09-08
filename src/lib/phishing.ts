// Pure logic behind /phishing/ -- no DOM, so it's directly unit-testable
// (see phishing.test.ts) and importable by the page.

export const MULTI_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'co.jp', 'co.in',
  'com.au', 'com.br', 'com.mx', 'co.nz', 'co.za',
]);
export const RISKY_TLDS = new Set(['tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'zip', 'mov', 'click', 'support']);
export const SUSPICIOUS_KEYWORDS = ['secure', 'login', 'verify', 'account', 'update', 'confirm', 'signin', 'banking', 'password'];

export function isIp(hostname: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4.test(hostname) || hostname.includes(':');
}

export function registrableDomain(hostname: string): string {
  if (isIp(hostname)) return hostname;
  const labels = hostname.split('.');
  if (labels.length <= 2) return hostname;
  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join('.');
  return lastTwo;
}

export interface Check { label: string; flag: boolean; detail: string; }

export function runChecks(raw: string): Check[] | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  const domain = registrableDomain(host);
  const subLabels = host.slice(0, host.length - domain.length).replace(/\.$/, '');
  const tld = domain.split('.').pop() ?? '';

  const checks: Check[] = [
    {
      label: 'HTTPS',
      flag: url.protocol !== 'https:',
      detail: url.protocol !== 'https:' ? 'Not encrypted — but note HTTPS alone proves nothing about trust.' : 'Encrypted connection.',
    },
    {
      label: 'Userinfo (@) trick',
      flag: url.username.length > 0,
      detail: url.username
        ? `Everything before "@" is ignored as an identity — the real host is "${host}".`
        : 'No "@" trick present.',
    },
    {
      label: 'Raw IP address',
      flag: isIp(host),
      detail: isIp(host) ? 'Host is a bare IP, not a domain — legitimate services almost never do this.' : 'Host is a normal domain.',
    },
    {
      label: 'Punycode / lookalike chars',
      flag: host.includes('xn--'),
      detail: host.includes('xn--') ? 'Encoded non-Latin characters — can visually impersonate a real domain.' : 'No punycode detected.',
    },
    {
      label: 'Keyword in subdomain',
      flag: SUSPICIOUS_KEYWORDS.some((k) => subLabels.toLowerCase().includes(k)),
      detail: subLabels
        ? `Subdomain "${subLabels}" is attacker-controlled text, not part of "${domain}".`
        : 'No subdomain present.',
    },
    {
      label: 'Deep subdomain nesting',
      flag: subLabels.split('.').filter(Boolean).length >= 2,
      detail: 'Multiple subdomain levels are often used to bury the real domain further left.',
    },
    {
      label: 'Hyphen-heavy hostname',
      flag: (host.match(/-/g) ?? []).length >= 3,
      detail: 'Real brand domains rarely need 3+ hyphens.',
    },
    {
      label: 'Elevated-risk TLD',
      flag: RISKY_TLDS.has(tld),
      detail: RISKY_TLDS.has(tld)
        ? `".${tld}" is cheap/free and correlates with abuse — not proof by itself.`
        : `".${tld}" has no special correlation with abuse.`,
    },
    {
      label: 'Unusually long URL',
      flag: raw.length > 75,
      detail: raw.length > 75 ? `${raw.length} characters — length is often used to push the real domain out of view.` : `${raw.length} characters.`,
    },
  ];
  return checks;
}
