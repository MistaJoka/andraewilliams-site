import { describe, it, expect } from 'vitest';
import { STACK_COMBOS, getStackCombo } from './stack-combos';

describe('STACK_COMBOS', () => {
  it('has unique ids', () => {
    const ids = STACK_COMBOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every combo has non-empty tool and offers text for all 3 layers, and a swap reason', () => {
    for (const combo of STACK_COMBOS) {
      for (const layer of [combo.frontend, combo.backend, combo.database]) {
        expect(layer.tool.length).toBeGreaterThan(0);
        expect(layer.offers.length).toBeGreaterThan(0);
      }
      expect(combo.swapWhen.length).toBeGreaterThan(0);
    }
  });

  it('has at least 4 combos covering different ecosystems', () => {
    expect(STACK_COMBOS.length).toBeGreaterThanOrEqual(4);
  });
});

describe('getStackCombo', () => {
  it('finds a real combo by id', () => {
    const mern = getStackCombo('mern');
    expect(mern?.name).toBe('MERN');
    expect(mern?.database.tool).toBe('MongoDB');
  });

  it('returns undefined for an unknown id', () => {
    expect(getStackCombo('nonexistent')).toBeUndefined();
  });
});
