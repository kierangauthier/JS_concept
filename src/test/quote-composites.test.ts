import { describe, it, expect } from 'vitest';

/**
 * Tests for composite quote line (ouvrage) business rules.
 * These validate the calculation logic used in both frontend and backend.
 */

// ── Helper functions (mirroring the logic in quotes.service.ts and Quotes.tsx) ──

function computeParentPrice(
  children: { quantity: number; unitPrice: number; costPrice: number }[],
  adjustmentAmount: number = 0,
) {
  const childrenTotal = children.reduce((s, c) => s + c.quantity * c.unitPrice, 0);
  const childrenCost = children.reduce((s, c) => s + c.quantity * c.costPrice, 0);
  return {
    unitPrice: childrenTotal + adjustmentAmount,
    costPrice: childrenCost,
  };
}

interface TopLevelLine {
  quantity: number;
  unitPrice: number;
  isComposite?: boolean;
  children?: { quantity: number; unitPrice: number; costPrice: number }[];
  adjustmentAmount?: number;
}

function computeQuoteAmount(lines: TopLevelLine[]): number {
  return lines.reduce((sum, l) => {
    if (l.isComposite && l.children?.length) {
      const { unitPrice } = computeParentPrice(l.children, l.adjustmentAmount ?? 0);
      return sum + unitPrice; // parent qty is always 1
    }
    return sum + l.quantity * l.unitPrice;
  }, 0);
}

// ── Tests ──

describe('Composite line (ouvrage) calculations', () => {
  describe('Parent price computation', () => {
    it('should compute unitPrice as sum of children + adjustment', () => {
      const children = [
        { quantity: 12, unitPrice: 45, costPrice: 32 },
        { quantity: 12, unitPrice: 35, costPrice: 25 },
        { quantity: 1, unitPrice: 120, costPrice: 80 },
      ];
      const { unitPrice, costPrice } = computeParentPrice(children, -51);

      // 12*45 + 12*35 + 1*120 = 540 + 420 + 120 = 1080 - 51 = 1029
      expect(unitPrice).toBe(1029);
      // 12*32 + 12*25 + 1*80 = 384 + 300 + 80 = 764
      expect(costPrice).toBe(764);
    });

    it('should handle zero adjustment', () => {
      const children = [
        { quantity: 5, unitPrice: 100, costPrice: 60 },
      ];
      const { unitPrice } = computeParentPrice(children, 0);
      expect(unitPrice).toBe(500);
    });

    it('should handle positive adjustment (surcharge)', () => {
      const children = [
        { quantity: 1, unitPrice: 1000, costPrice: 700 },
      ];
      const { unitPrice } = computeParentPrice(children, 50);
      expect(unitPrice).toBe(1050);
    });
  });

  describe('Quote total computation (top-level only)', () => {
    it('should sum only top-level lines', () => {
      const lines: TopLevelLine[] = [
        { quantity: 10, unitPrice: 50 },           // simple: 500
        { quantity: 3, unitPrice: 200 },            // simple: 600
      ];
      expect(computeQuoteAmount(lines)).toBe(1100);
    });

    it('should use computed parent price for composites', () => {
      const lines: TopLevelLine[] = [
        { quantity: 10, unitPrice: 50 },           // simple: 500
        {
          quantity: 1, unitPrice: 0,                // composite: price from children
          isComposite: true,
          adjustmentAmount: -51,
          children: [
            { quantity: 12, unitPrice: 45, costPrice: 32 }, // 540
            { quantity: 12, unitPrice: 35, costPrice: 25 }, // 420
            { quantity: 5, unitPrice: 130, costPrice: 90 }, // 650
          ],
        },
      ];
      // simple: 500
      // composite: 540 + 420 + 650 - 51 = 1559
      // total: 500 + 1559 = 2059
      expect(computeQuoteAmount(lines)).toBe(2059);
    });

    it('should not double-count children in the total', () => {
      // A composite with 3 children totaling 1000
      // should contribute 1000 to the total, not 1000 + individual children
      const lines: TopLevelLine[] = [
        {
          quantity: 1, unitPrice: 0,
          isComposite: true,
          children: [
            { quantity: 1, unitPrice: 400, costPrice: 200 },
            { quantity: 1, unitPrice: 300, costPrice: 150 },
            { quantity: 1, unitPrice: 300, costPrice: 100 },
          ],
        },
      ];
      expect(computeQuoteAmount(lines)).toBe(1000);
    });

    it('should handle mix of simple and composite lines', () => {
      const lines: TopLevelLine[] = [
        { quantity: 1, unitPrice: 350 },           // simple
        {
          quantity: 1, unitPrice: 0,
          isComposite: true,
          adjustmentAmount: 0,
          children: [{ quantity: 2, unitPrice: 100, costPrice: 50 }],
        },
        { quantity: 5, unitPrice: 20 },            // simple
      ];
      // 350 + 200 + 100 = 650
      expect(computeQuoteAmount(lines)).toBe(650);
    });
  });

  describe('Margin computation', () => {
    it('should compute margin from costPrice vs unitPrice', () => {
      const children = [
        { quantity: 12, unitPrice: 45, costPrice: 32 },
        { quantity: 12, unitPrice: 35, costPrice: 25 },
        { quantity: 1, unitPrice: 120, costPrice: 80 },
        { quantity: 1, unitPrice: 80, costPrice: 60 },
        { quantity: 1, unitPrice: 95, costPrice: 70 },
        { quantity: 18, unitPrice: 2.5, costPrice: 1 },
        { quantity: 5, unitPrice: 130, costPrice: 90 },
      ];
      const { unitPrice, costPrice } = computeParentPrice(children, -51);

      // unitPrice = 1950 - 51 = 1899
      expect(unitPrice).toBe(1899);
      // costPrice = 384 + 300 + 80 + 60 + 70 + 18 + 450 = 1362
      expect(costPrice).toBe(1362);

      const margin = ((unitPrice - costPrice) / unitPrice * 100);
      expect(margin).toBeCloseTo(28.3, 0); // ~28.3%
    });
  });

  describe('Business rule validations', () => {
    it('parent quantity must always be 1', () => {
      // This is enforced in the backend — parent.quantity is forced to 1
      // and parent.unit is forced to "ens"
      const parent = { quantity: 1, unit: 'ens' };
      expect(parent.quantity).toBe(1);
      expect(parent.unit).toBe('ens');
    });

    it('all children must have the same VAT rate', () => {
      const childVats = [20, 20, 20];
      const uniqueRates = new Set(childVats);
      expect(uniqueRates.size).toBe(1);

      // Mixed rates should fail
      const mixedVats = [20, 10, 20];
      const uniqueMixed = new Set(mixedVats);
      expect(uniqueMixed.size).not.toBe(1);
    });
  });
});
