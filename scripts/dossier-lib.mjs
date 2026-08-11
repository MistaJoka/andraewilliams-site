/** Shared dossier logic: schema validation and overlay/API merging. */

export const ENUMS = {
  tier: ['featured', 'listed', 'hidden'],
  class: ['ai', 'cyber', 'iot', 'game', 'client', 'learning'],
  status: ['active', 'stable', 'archived'],
  redaction: ['none', 'no-code-link', 'sanitized'],
  source: ['github-api', 'manual'],
};

const REQUIRED = ['id', 'codename', 'tier', 'class', 'status', 'brief', 'redaction', 'source'];
const LINK_KEYS = ['repo', 'demo', 'writeup'];

export function validateProjects(data) {
  const errors = [];
  if (!data || !Array.isArray(data.projects)) {
    return ['overlay root must be { "projects": [...] }'];
  }
  const seen = new Set();
  for (const p of data.projects) {
    const label = p && p.id ? p.id : '<no id>';
    for (const field of REQUIRED) {
      if (typeof p[field] !== 'string' || p[field].trim() === '') {
        errors.push(`${label}: missing or empty required field "${field}"`);
      }
    }
    for (const [field, allowed] of Object.entries(ENUMS)) {
      if (typeof p[field] === 'string' && !allowed.includes(p[field])) {
        errors.push(`${label}: invalid ${field} "${p[field]}" (allowed: ${allowed.join(', ')})`);
      }
    }
    if (p.links !== undefined) {
      if (typeof p.links !== 'object' || p.links === null || Array.isArray(p.links)) {
        errors.push(`${label}: links must be an object`);
      } else {
        for (const key of Object.keys(p.links)) {
          if (!LINK_KEYS.includes(key)) errors.push(`${label}: unknown links key "${key}"`);
          else if (typeof p.links[key] !== 'string') errors.push(`${label}: links.${key} must be a string`);
        }
      }
    }
    if (p.redaction && p.redaction !== 'none' && p.links && p.links.repo) {
      errors.push(`${label}: redaction "${p.redaction}" forbids links.repo`);
    }
    if (p.id) {
      if (seen.has(p.id)) errors.push(`${label}: duplicate id`);
      seen.add(p.id);
    }
  }
  return errors;
}

export function mergeDossier(entry, apiData) {
  const meta = apiData
    ? { language: apiData.language ?? null, pushedAt: apiData.pushed_at ?? null, archived: Boolean(apiData.archived) }
    : {};
  return { ...entry, links: { ...(entry.links || {}) }, meta };
}

/**
 * fetchResults: Map<id, {ok, data}> for source:"github-api" entries only.
 * Returns dossiers (hidden excluded), fresh cache of successful fetches, warnings.
 */
export function buildDossierList(projects, fetchResults) {
  const dossiers = [];
  const cache = {};
  const warnings = [];
  for (const entry of projects) {
    let apiData = null;
    if (entry.source === 'github-api') {
      const result = fetchResults.get(entry.id);
      if (result && result.ok) {
        apiData = result.data;
        cache[entry.id] = result.data;
      } else if (result) {
        warnings.push(`${entry.id}: GitHub fetch failed, no cache entry — building from overlay only`);
      }
    }
    if (entry.tier !== 'hidden') dossiers.push(mergeDossier(entry, apiData));
  }
  return { dossiers, cache, warnings };
}
