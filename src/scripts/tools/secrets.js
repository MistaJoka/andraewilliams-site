// Best-effort config redaction — not a guarantee. Masks values on lines
// whose key name looks secret-shaped (.env, YAML, JSON assignment forms),
// plus a few standalone token formats that are recognizable without a
// key name at all. Anything it can't confidently identify is left alone
// rather than guessed at — always eyeball the output before sharing it.

const SECRET_KEY_RE = /(secret|password|passwd|pwd|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|auth|dsn|connection[_-]?string|client[_-]?secret|signing[_-]?key)/i;

// `d` flag gives exact [start, end] offsets per group via m.indices, so
// the value can be sliced out and replaced precisely instead of guessed
// at with indexOf (which breaks if the value text recurs earlier in the
// line).
const ASSIGNMENT_PATTERNS = [
  /^(\s*(?:export\s+)?[\w.-]+)\s*=\s*(.+)$/d, // .env / shell: KEY=value
  /^(\s*"[\w.-]+")\s*:\s*(.+)$/d, // JSON: "key": "value"
  /^(\s*[\w.-]+)\s*:\s*(.+)$/d, // YAML: key: value
];

const STANDALONE_PATTERNS = [
  { name: 'AWS Access Key ID', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'JWT', re: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g },
];

const PRIVATE_KEY_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const BASIC_AUTH_URL_RE = /(\w+:\/\/[^\s:@/]+):([^\s@]+)@/g;

const MASK = '••••••••';

function maskValue(raw) {
  const trimmed = raw.trimEnd();
  const trailer = raw.slice(trimmed.length); // preserve trailing whitespace/newline
  const m = /^("|')(.*)\1$/.exec(trimmed);
  if (m) return `${m[1]}${MASK}${m[1]}${trailer}`;
  return `${MASK}${trailer}`;
}

/** Redacts likely secrets in `text`. Returns the redacted text and a count of redactions made. */
export function redact(text) {
  let count = 0;

  let working = text.replace(PRIVATE_KEY_RE, () => {
    count++;
    return '[REDACTED PRIVATE KEY]';
  });

  working = working.replace(BASIC_AUTH_URL_RE, (_match, prefix) => {
    count++;
    return `${prefix}:${MASK}@`;
  });

  const lines = working.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return line;

    for (const re of ASSIGNMENT_PATTERNS) {
      const m = re.exec(line);
      if (!m) continue;
      const [, key, value] = m;
      if (!SECRET_KEY_RE.test(key) || !value.trim()) break;
      count++;
      const [valueStart] = m.indices[2];
      return line.slice(0, valueStart) + maskValue(value);
    }

    let redactedLine = line;
    for (const { re } of STANDALONE_PATTERNS) {
      redactedLine = redactedLine.replace(re, () => {
        count++;
        return MASK;
      });
    }
    return redactedLine;
  });

  return { output: lines.join('\n'), count };
}
