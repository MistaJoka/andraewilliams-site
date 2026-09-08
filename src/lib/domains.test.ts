import { describe, it, expect } from 'vitest';
import { DOMAINS, findTopic, allTopics } from './domains';

// How long a topic can go unverified before CI starts failing on
// purpose -- a real gate, not just a "Verified: <date>" display field.
// AI moves fast; this whole domain is explicitly framed as covering
// fast-moving facts, so it gets a tighter window than the rest.
const STALE_AFTER_DAYS: Record<string, number> = { ai: 180 };
const DEFAULT_STALE_AFTER_DAYS = 365;

describe('domains data integrity', () => {
  it('every related href points at a topic that actually exists', () => {
    for (const { topic } of allTopics()) {
      for (const href of topic.related ?? []) {
        expect(findTopic(href), `${topic.href} links to missing topic ${href}`).toBeDefined();
      }
    }
  });

  it('every topic has a parseable lastVerified date', () => {
    for (const { topic } of allTopics()) {
      expect(Number.isNaN(Date.parse(topic.lastVerified)), `${topic.href} has an unparseable lastVerified`).toBe(false);
    }
  });

  it('no topic has gone stale past its domain\'s freshness window', () => {
    const now = Date.now();
    for (const { domain, topic } of allTopics()) {
      const maxDays = STALE_AFTER_DAYS[domain.slug] ?? DEFAULT_STALE_AFTER_DAYS;
      const ageDays = (now - Date.parse(topic.lastVerified)) / (1000 * 60 * 60 * 24);
      expect(ageDays, `${topic.href} hasn't been verified in ${Math.round(ageDays)} days (limit ${maxDays}) -- re-check its facts and bump lastVerified`).toBeLessThanOrEqual(maxDays);
    }
  });

  it('every domain has at least one topic', () => {
    for (const domain of DOMAINS) {
      expect(domain.topics.length, `${domain.slug} has no topics`).toBeGreaterThan(0);
    }
  });
});
