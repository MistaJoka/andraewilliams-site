import { describe, it, expect } from 'vitest';
import { computeCidr } from './cidr';

describe('computeCidr', () => {
  it('computes a typical /24 home network correctly', () => {
    const r = computeCidr('192.168.1.10/24')!;
    expect(r.network).toBe('192.168.1.0');
    expect(r.broadcast).toBe('192.168.1.255');
    expect(r.netmask).toBe('255.255.255.0');
    expect(r.first).toBe('192.168.1.1');
    expect(r.last).toBe('192.168.1.254');
    expect(r.total).toBe(256);
    expect(r.usable).toBe(254);
  });

  it('computes a huge /8 private range correctly', () => {
    const r = computeCidr('10.0.0.5/8')!;
    expect(r.network).toBe('10.0.0.0');
    expect(r.broadcast).toBe('10.255.255.255');
    expect(r.total).toBe(16777216);
    expect(r.usable).toBe(16777214);
  });

  it('treats a /32 as a single usable host (no network/broadcast reserved)', () => {
    const r = computeCidr('192.168.1.1/32')!;
    expect(r.total).toBe(1);
    expect(r.usable).toBe(1);
    expect(r.first).toBe('192.168.1.1');
    expect(r.last).toBe('192.168.1.1');
  });

  it('treats a /31 as a point-to-point link per RFC 3021 (both addresses usable)', () => {
    const r = computeCidr('192.168.1.0/31')!;
    expect(r.total).toBe(2);
    expect(r.usable).toBe(2);
    expect(r.first).toBe('192.168.1.0');
    expect(r.last).toBe('192.168.1.1');
  });

  it('handles /0 without the JS `<<32`-is-a-no-op bug', () => {
    const r = computeCidr('0.0.0.0/0')!;
    expect(r.network).toBe('0.0.0.0');
    expect(r.broadcast).toBe('255.255.255.255');
    expect(r.netmask).toBe('0.0.0.0');
    expect(r.total).toBe(4294967296);
  });

  it('rejects an octet over 255', () => {
    expect(computeCidr('256.1.1.1/24')).toBeNull();
  });

  it('rejects a prefix over 32', () => {
    expect(computeCidr('192.168.1.1/33')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(computeCidr('garbage')).toBeNull();
  });
});
