import { describe, it, expect } from 'vitest';
import { isIp, registrableDomain, runChecks } from './phishing';

describe('isIp', () => {
  it('recognizes an IPv4 address', () => {
    expect(isIp('203.0.113.5')).toBe(true);
  });
  it('does not flag a normal domain', () => {
    expect(isIp('paypal.com')).toBe(false);
  });
});

describe('registrableDomain', () => {
  it('strips a www subdomain down to the real domain', () => {
    expect(registrableDomain('www.paypal.com')).toBe('paypal.com');
  });
  it('handles a multi-part TLD (co.uk) correctly', () => {
    expect(registrableDomain('mail.google.co.uk')).toBe('google.co.uk');
  });
  it('does not slice an IP address like a hostname', () => {
    // Regression: an earlier version sliced IPs as if they were normal
    // hostnames and returned a nonsense fragment like "113.5".
    expect(registrableDomain('203.0.113.5')).toBe('203.0.113.5');
  });
  it('identifies the real domain in a lookalike-subdomain attack', () => {
    expect(registrableDomain('paypal.com-secure-login.verify-account-update.tk')).toBe('verify-account-update.tk');
  });
});

describe('runChecks', () => {
  it('returns null for an unparseable URL', () => {
    expect(runChecks('not a url')).toBeNull();
  });

  it('flags nothing suspicious on a clean HTTPS URL', () => {
    const checks = runChecks('https://www.paypal.com/signin')!;
    expect(checks.find((c) => c.label === 'HTTPS')!.flag).toBe(false);
    expect(checks.find((c) => c.label === 'Raw IP address')!.flag).toBe(false);
    expect(checks.find((c) => c.label === 'Userinfo (@) trick')!.flag).toBe(false);
    expect(checks.find((c) => c.label === 'Elevated-risk TLD')!.flag).toBe(false);
  });

  it('flags a lookalike domain on multiple checks at once', () => {
    const checks = runChecks('http://paypal.com-secure-login.verify-account-update.tk/signin')!;
    expect(checks.find((c) => c.label === 'HTTPS')!.flag).toBe(true);
    expect(checks.find((c) => c.label === 'Keyword in subdomain')!.flag).toBe(true);
    expect(checks.find((c) => c.label === 'Hyphen-heavy hostname')!.flag).toBe(true);
    expect(checks.find((c) => c.label === 'Elevated-risk TLD')!.flag).toBe(true);
  });

  it('flags the userinfo (@) trick and the raw-IP host together', () => {
    const checks = runChecks('http://paypal.com@203.0.113.5/login')!;
    expect(checks.find((c) => c.label === 'Userinfo (@) trick')!.flag).toBe(true);
    expect(checks.find((c) => c.label === 'Raw IP address')!.flag).toBe(true);
  });
});
