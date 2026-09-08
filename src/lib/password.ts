// Pure logic behind /password-cracking/ -- no DOM, so it's directly
// unit-testable (see password.test.ts) and importable by the page.

// Widely published "most common passwords" -- the same ~100 entries show
// up across a decade of breach-analysis lists. Not exhaustive; the point
// is that these get tried before any brute-force math starts.
export const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'abc123', 'password1',
  '111111', '123123', '1234567', 'dragon', 'letmein', 'monkey', 'football', 'iloveyou',
  'admin', 'welcome', 'login', 'princess', 'solo', 'starwars', 'master', 'hello',
  'freedom', 'whatever', 'qazwsx', 'trustno1', 'superman', 'batman', 'shadow', 'michael',
  'jennifer', 'jordan', 'hunter', 'buster', 'harley', 'ranger', 'tigger', 'sunshine',
  'chelsea', 'george', 'andrea', 'joshua', 'maggie', 'mustang', 'baseball', 'dallas',
  'jessica', 'pepper', 'daniel', 'access', 'flower', 'hockey', 'thomas', 'robert',
  'soccer', 'killer', 'andrew', 'charlie', 'secret', 'summer', 'internet', 'service',
  'canada', 'hello123', 'cheese', 'ginger', 'banana', 'biteme', 'matthew', 'corvette',
  'bigdog', 'cowboy', 'boomer', 'yankees', 'lakers', 'test123', 'passw0rd', 'p@ssw0rd',
  'qwerty123', '1q2w3e4r', 'zaq12wsx', 'asdfghjkl', '000000', '1111', '121212', '654321',
  '7777777', '1qaz2wsx', 'iloveyou1', 'myspace1', 'password123', 'welcome1', 'changeme',
]);

export interface CharCounts { lower: number; upper: number; digit: number; symbol: number; }

export function counts(pw: string): CharCounts {
  let lower = 0, upper = 0, digit = 0, symbol = 0;
  for (const ch of pw) {
    if (/[a-z]/.test(ch)) lower++;
    else if (/[A-Z]/.test(ch)) upper++;
    else if (/[0-9]/.test(ch)) digit++;
    else symbol++;
  }
  return { lower, upper, digit, symbol };
}

export function charsetSize(c: CharCounts): number {
  let size = 0;
  if (c.lower) size += 26;
  if (c.upper) size += 26;
  if (c.digit) size += 10;
  if (c.symbol) size += 33;
  return size || 1;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return 'instant';
  const units: [string, string, number][] = [
    ['second', 'seconds', 1], ['minute', 'minutes', 60], ['hour', 'hours', 3600],
    ['day', 'days', 86400], ['year', 'years', 31557600],
    ['century', 'centuries', 3155760000], ['millennium', 'millennia', 31557600000],
  ];
  let chosen = units[0];
  for (const u of units) if (seconds >= u[2]) chosen = u;
  const [singular, plural, unitSeconds] = chosen;
  const value = seconds / unitSeconds;
  if (value >= 1e6) return `${value.toExponential(1)} ${plural}`;
  const display = value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString();
  return `${display} ${display === '1' || display === '1.0' ? singular : plural}`;
}
