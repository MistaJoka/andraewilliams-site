// 5-field cron parsing, next-run simulation, and a plain-English
// describer. Pure functions, no DOM — `nextRuns` takes `from` as a
// parameter rather than reading the clock itself, so it stays testable.

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseField(field, min, max) {
  const values = new Set();
  for (const part of field.split(',')) {
    let m;
    if (part === '*') {
      for (let v = min; v <= max; v++) values.add(v);
    } else if ((m = /^\*\/(\d+)$/.exec(part))) {
      const step = Number(m[1]);
      if (step < 1) return null;
      for (let v = min; v <= max; v += step) values.add(v);
    } else if ((m = /^(\d+)-(\d+)\/(\d+)$/.exec(part))) {
      const [a, b, step] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (a < min || b > max || a > b || step < 1) return null;
      for (let v = a; v <= b; v += step) values.add(v);
    } else if ((m = /^(\d+)-(\d+)$/.exec(part))) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a < min || b > max || a > b) return null;
      for (let v = a; v <= b; v++) values.add(v);
    } else if (/^\d+$/.test(part)) {
      const v = Number(part);
      if (v < min || v > max) return null;
      values.add(v);
    } else {
      return null;
    }
  }
  return values.size ? values : null;
}

/** Parses a 5-field cron expression, or returns null if it's invalid. */
export function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minS, hourS, domS, monS, dowS] = parts;

  const minute = parseField(minS, 0, 59);
  const hour = parseField(hourS, 0, 23);
  const dom = parseField(domS, 1, 31);
  const month = parseField(monS, 1, 12);
  const dow = parseField(dowS, 0, 7);
  if (!minute || !hour || !dom || !month || !dow) return null;

  if (dow.has(7)) { dow.delete(7); dow.add(0); } // 7 is also Sunday

  return { minute, hour, dom, month, dow, domWild: domS === '*', dowWild: dowS === '*' };
}

// POSIX cron: when BOTH day-of-month and day-of-week are restricted,
// a day matching EITHER one counts — it's an OR, not an AND.
function dayMatches(date, spec) {
  if (spec.domWild && spec.dowWild) return true;
  const domOk = spec.dom.has(date.getDate());
  const dowOk = spec.dow.has(date.getDay());
  if (spec.domWild) return dowOk;
  if (spec.dowWild) return domOk;
  return domOk || dowOk;
}

/** Next `count` run times at or after `from`, searched minute-by-minute up to ~4 years out. */
export function nextRuns(spec, from, count, maxMinutes = 4 * 366 * 24 * 60) {
  const results = [];
  const t = new Date(from);
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);

  for (let i = 0; i < maxMinutes && results.length < count; i++, t.setMinutes(t.getMinutes() + 1)) {
    if (spec.minute.has(t.getMinutes()) && spec.hour.has(t.getHours()) && spec.month.has(t.getMonth() + 1) && dayMatches(t, spec)) {
      results.push(new Date(t));
    }
  }
  return results;
}

const isEvery = (set, min, max) => set.size === max - min + 1;
const pad2 = (n) => String(n).padStart(2, '0');

function listLabel(set, names) {
  const arr = [...set].sort((a, b) => a - b);
  const label = (v) => (names ? names[v] : String(v));
  if (arr.length > 2 && arr.every((v, i) => i === 0 || v === arr[i - 1] + 1)) {
    return `${label(arr[0])}–${label(arr[arr.length - 1])}`;
  }
  return arr.map(label).join(', ');
}

/** Best-effort plain-English description of a parsed cron spec. */
export function describe(spec) {
  const minuteEvery = isEvery(spec.minute, 0, 59);
  const hourEvery = isEvery(spec.hour, 0, 23);
  const minuteArr = [...spec.minute].sort((a, b) => a - b);
  const hourArr = [...spec.hour].sort((a, b) => a - b);

  let timeClause;
  if (minuteEvery && hourEvery) {
    timeClause = 'Every minute';
  } else if (hourEvery && minuteArr.length > 1) {
    const step = minuteArr[1] - minuteArr[0];
    const isStep = minuteArr[0] === 0 && minuteArr.every((v, i) => v === i * step);
    timeClause = isStep ? `Every ${step} minutes` : `At minute ${listLabel(spec.minute)} of every hour`;
  } else if (hourEvery) {
    timeClause = `At minute ${minuteArr[0]} of every hour`;
  } else if (minuteArr.length === 1) {
    timeClause = `At ${hourArr.map((h) => `${pad2(h)}:${pad2(minuteArr[0])}`).join(', ')}`;
  } else {
    timeClause = `At minute(s) ${listLabel(spec.minute)} past hour(s) ${listLabel(spec.hour)}`;
  }

  let dateClause;
  if (spec.domWild && spec.dowWild) {
    dateClause = 'every day';
  } else if (spec.dowWild) {
    dateClause = `on day ${listLabel(spec.dom)} of the month`;
  } else if (spec.domWild) {
    dateClause = `on ${listLabel(spec.dow, WEEKDAYS)}`;
  } else {
    dateClause = `on day ${listLabel(spec.dom)} of the month, or on ${listLabel(spec.dow, WEEKDAYS)}`;
  }

  const monthClause = isEvery(spec.month, 1, 12) ? '' : ` in ${listLabel(spec.month, MONTHS)}`;

  return `${timeClause}, ${dateClause}${monthClause}.`;
}
