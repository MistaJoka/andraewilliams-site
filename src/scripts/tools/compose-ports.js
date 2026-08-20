// A deliberately narrow docker-compose reader — not a general YAML parser.
// It walks exactly the shape needed to find `services: <name>: ports: [...]`
// and pull out host-port mappings in short syntax ("8080:80",
// "127.0.0.1:8080:80", "8080-8090:80-90"). Anchors, merge keys, env var
// interpolation (`${VAR}`) and the long `target:`/`published:` mapping
// form are out of scope — those entries are reported as unparsed rather
// than silently dropped, so a real collision hiding in one never reads
// as "all clear".

const PORT_RE = /^(?:(\d{1,3}(?:\.\d{1,3}){3}):)?(\d+)(?:-(\d+))?:(\d+)(?:-(\d+))?(?:\/(tcp|udp))?$/;

function stripComment(line) {
  let inQuote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

const indentOf = (line) => line.length - line.trimStart().length;

function unquote(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parsePortEntry(raw) {
  const value = unquote(raw);
  if (value.includes('${')) return { raw: value, ok: false };
  const m = PORT_RE.exec(value);
  if (!m) return { raw: value, ok: false };
  return {
    raw: value,
    ok: true,
    hostIp: m[1] || null,
    hostStart: Number(m[2]),
    hostEnd: m[3] ? Number(m[3]) : Number(m[2]),
  };
}

function parseInlineArray(text) {
  const inner = text.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!inner.trim()) return [];
  const items = [];
  let current = '';
  let inQuote = null;
  for (const ch of inner) {
    if (inQuote) {
      current += ch;
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inQuote = ch; current += ch; continue; }
    if (ch === ',') { items.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) items.push(current);
  return items.map((s) => s.trim()).filter(Boolean);
}

/** Parses compose YAML text into per-service port mappings. */
export function parseCompose(text) {
  const lines = text.split('\n').map(stripComment);
  const services = [];
  const unparsed = [];

  let i = 0;
  while (i < lines.length && !/^services:\s*$/.test(lines[i])) i++;
  if (i >= lines.length) return { services, unparsed, servicesFound: false };
  i++;

  let serviceIndent = null;
  let currentService = null;
  let inPorts = false;
  let portsKeyIndent = null;
  let portsItemIndent = null;

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const indent = indentOf(line);
    const trimmed = line.trim();

    if (serviceIndent === null) {
      if (indent === 0) break;
      serviceIndent = indent;
    }
    if (indent === 0) break;

    if (indent === serviceIndent && /^[\w.-]+:\s*$/.test(trimmed)) {
      currentService = { name: trimmed.slice(0, -1), ports: [] };
      services.push(currentService);
      inPorts = false;
      continue;
    }
    if (!currentService || indent <= serviceIndent) continue;

    if (inPorts && trimmed.startsWith('-')) {
      if (portsItemIndent === null) portsItemIndent = indent;
      if (indent === portsItemIndent) {
        const parsed = parsePortEntry(trimmed.slice(1).trim());
        if (parsed.ok) currentService.ports.push(parsed);
        else unparsed.push({ service: currentService.name, raw: parsed.raw });
      }
      continue;
    }
    if (inPorts && indent > portsKeyIndent) continue; // long-syntax continuation — unsupported, skip
    inPorts = false;

    if (/^ports:\s*$/.test(trimmed)) {
      inPorts = true;
      portsKeyIndent = indent;
      portsItemIndent = null;
      continue;
    }
    if (/^ports:\s*\[.*\]\s*$/.test(trimmed)) {
      for (const item of parseInlineArray(trimmed.slice('ports:'.length))) {
        const parsed = parsePortEntry(item);
        if (parsed.ok) currentService.ports.push(parsed);
        else unparsed.push({ service: currentService.name, raw: parsed.raw });
      }
    }
  }

  return { services, unparsed, servicesFound: true };
}

/** Flags overlapping host-port ranges bound across two different services. */
export function findCollisions(services) {
  const entries = services.flatMap((s) => s.ports.map((p) => ({ service: s.name, ...p })));
  const collisions = [];
  for (let a = 0; a < entries.length; a++) {
    for (let b = a + 1; b < entries.length; b++) {
      const x = entries[a];
      const y = entries[b];
      if (x.service === y.service) continue;
      const sameInterface = !x.hostIp || !y.hostIp || x.hostIp === y.hostIp;
      const overlaps = x.hostStart <= y.hostEnd && y.hostStart <= x.hostEnd;
      if (sameInterface && overlaps) {
        collisions.push({ services: [x.service, y.service], ports: [x.raw, y.raw] });
      }
    }
  }
  return collisions;
}
