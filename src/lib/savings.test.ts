import { describe, expect, it } from "vitest";
import {
  annualToPeriodRate,
  compareBalances,
  DEFAULT_INPUT,
  directBalance,
  iterativeBalance,
  MAX_PERIODS,
  naiveBalance,
  simulateSavings,
} from "./savings";

// Independent reference: rational arithmetic with exact BigInt operations.
// Only the final fraction is converted to a floating-point number.
function rationalBalance(
  contribution: bigint,
  rateNumerator: bigint,
  rateDenominator: bigint,
  periods: number,
): number {
  let numerator = 0n;
  let denominator = 1n;
  for (let period = 1; period <= periods; period += 1) {
    numerator =
      (rateDenominator + rateNumerator) * numerator +
      contribution * denominator * rateDenominator;
    denominator *= rateDenominator;
  }
  return Number(numerator) / Number(denominator);
}

describe("annualToPeriodRate", () => {
  it.each([
    [0, 0],
    [36.5, 0.03],
    [365, 0.3],
    [1000, 30 / 36.5],
  ])("converts a TNA of %s to a 30-day rate", (annualRate, expected) => {
    expect(annualToPeriodRate(annualRate)).toBeCloseTo(expected, 14);
  });

  it.each([-1, 1000.01, Number.NaN, Infinity, -Infinity])(
    "rejects an annual rate of %s",
    (annualRate) => {
      expect(() => annualToPeriodRate(annualRate)).toThrow(RangeError);
    },
  );
});

describe.each([
  ["iterative", iterativeBalance],
  ["direct", directBalance],
  ["naive", naiveBalance],
] as const)("%s balance", (_, calculate) => {
  it("has no capital before the first period", () => {
    expect(calculate(100_000, 0.03, 0)).toBe(0);
  });

  it("does not pay interest on the first end-of-period contribution", () => {
    expect(calculate(100_000, 0.03, 1)).toBeCloseTo(100_000, 7);
  });

  it("matches the manually worked sequence 0, 100, 210, 331", () => {
    const actual = [0, 1, 2, 3].map((period) => calculate(100, 0.1, period));
    [0, 100, 210, 331].forEach((expected, period) => {
      expect(actual[period]).toBeCloseTo(expected, 10);
    });
  });

  it("reduces to simple contributions when the rate is zero", () => {
    expect(calculate(100_000, 0, 60)).toBe(6_000_000);
  });

  it("has a zero balance without contributions", () => {
    expect(calculate(0, 0.03, 60)).toBe(0);
  });

  it("keeps fractional cents throughout the calculation", () => {
    // Rounding each period would produce 2.00 instead of 2.001.
    expect(calculate(1, 0.001, 2)).toBeCloseTo(2.001, 12);
    expect(calculate(0.01, 0.01, 3)).toBeCloseTo(0.030301, 14);
  });

  it.each([
    [-1, 0.03, 12],
    [1_000_000_001, 0.03, 12],
    [Number.NaN, 0.03, 12],
    [Infinity, 0.03, 12],
    [100_000, -0.01, 12],
    [100_000, 1, 12],
    [100_000, Number.NaN, 12],
    [100_000, Infinity, 12],
    [100_000, 0.03, -1],
    [100_000, 0.03, 61],
    [100_000, 0.03, 1.5],
    [100_000, 0.03, Number.NaN],
    [100_000, 0.03, Infinity],
  ])(
    "rejects invalid inputs (%s, %s, %s)",
    (contribution, periodRate, periods) => {
      expect(() => calculate(contribution, periodRate, periods)).toThrow(
        RangeError,
      );
    },
  );
});

describe.each([
  ["iterative", iterativeBalance],
  ["direct", directBalance],
] as const)(
  "%s calculation against independent rational references",
  (_, calculate) => {
    it.each([
      [1n, 100n, 3],
      [3n, 100n, 12],
      [1n, 5n, 60],
      [0n, 1n, 60],
    ] as const)(
      "matches exact rational interest %s/%s for %s periods",
      (r, d, n) => {
        const expected = rationalBalance(100_000n, r, d, n);
        const actual = calculate(100_000, Number(r) / Number(d), n);
        expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
          Math.max(1e-8, Math.abs(expected) * 1e-13),
        );
      },
    );
  },
);

describe("numerical precision", () => {
  it.each([1e-12, 1e-16, Number.MIN_VALUE])(
    "preserves the zero-rate limit for a period rate of %s",
    (periodRate) => {
      expect(directBalance(100_000, periodRate, 60)).toBeCloseTo(6_000_000, 3);
    },
  );

  it("exposes cancellation in the naive formula near zero", () => {
    const stable = directBalance(100_000, 1e-16, 60);
    const naive = naiveBalance(100_000, 1e-16, 60);
    expect(stable).toBeCloseTo(6_000_000, 6);
    expect(naive).toBe(0);
    expect(compareBalances(stable, naive).agrees).toBe(false);
  });

  it("avoids avoidable underflow for very small contributions", () => {
    const actual = directBalance(1e-310, 1e-16, 60);
    expect(actual).toBeGreaterThan(0);
    expect(Math.abs(actual / 6e-309 - 1)).toBeLessThan(1e-12);
  });
});

describe("compareBalances", () => {
  it("compares two zero balances without dividing by zero", () => {
    expect(compareBalances(0, 0)).toEqual({
      absoluteDifference: 0,
      relativeDifference: 0,
      tolerance: 1e-6,
      agrees: true,
    });
  });

  it("accounts for an absolute tolerance near zero", () => {
    expect(compareBalances(0, 5e-7).agrees).toBe(true);
    expect(compareBalances(0, 5e-5).agrees).toBe(false);
  });

  it("accounts for a relative tolerance at larger balances", () => {
    const result = compareBalances(1e12, 1e12 + 0.5);
    expect(result.absoluteDifference).toBe(0.5);
    expect(result.relativeDifference).toBeCloseTo(5e-13, 23);
    expect(result.agrees).toBe(true);
    expect(compareBalances(1e12, 1e12 + 100).agrees).toBe(false);
  });

  it("is symmetric in its inputs", () => {
    expect(compareBalances(100, 100.001)).toEqual(
      compareBalances(100.001, 100),
    );
  });

  it.each([Number.NaN, Infinity, -Infinity])(
    "rejects non-finite balance %s",
    (value) => {
      expect(() => compareBalances(value, 0)).toThrow(RangeError);
      expect(() => compareBalances(0, value)).toThrow(RangeError);
    },
  );

  it("rejects a comparison whose difference overflows", () => {
    expect(() => compareBalances(Number.MAX_VALUE, -Number.MAX_VALUE)).toThrow(
      RangeError,
    );
  });
});

describe("simulateSavings", () => {
  it("includes the initial condition and all requested periods", () => {
    const results = simulateSavings(DEFAULT_INPUT);
    expect(results).toHaveLength(DEFAULT_INPUT.periods + 1);
    expect(results[0]).toEqual({
      period: 0,
      contributed: 0,
      interest: 0,
      balance: 0,
      directBalance: 0,
    });
    expect(results[1].balance).toBe(DEFAULT_INPUT.contribution);
    expect(results[1].interest).toBe(0);
  });

  it.each([0, 0.000000000001, 30, 36.5, 1000])(
    "keeps every row consistent for a TNA of %s",
    (annualRate) => {
      const contribution = 100_000;
      const results = simulateSavings({
        contribution,
        annualRate,
        periods: 60,
      });
      const periodRate = annualToPeriodRate(annualRate);
      results.forEach((row, index) => {
        expect(row.period).toBe(index);
        expect(row.contributed).toBe(index * contribution);
        expect(row.interest).toBe(row.balance - row.contributed);
        expect(row.balance).toBe(
          iterativeBalance(contribution, periodRate, index),
        );
        expect(compareBalances(row.balance, row.directBalance).agrees).toBe(
          true,
        );
        expect(Number.isFinite(row.balance)).toBe(true);
        expect(Number.isFinite(row.directBalance)).toBe(true);
        if (index > 0) {
          expect(row.balance).toBeGreaterThanOrEqual(
            results[index - 1].balance,
          );
          expect(row.interest).toBeGreaterThanOrEqual(
            results[index - 1].interest,
          );
        }
      });
    },
  );

  it("agrees with manually computed balances for a 36.5% TNA", () => {
    const results = simulateSavings({
      contribution: 100,
      annualRate: 36.5,
      periods: 3,
    });
    [0, 100, 203, 309.09].forEach((expected, period) => {
      expect(results[period].balance).toBeCloseTo(expected, 10);
    });
  });

  it("supports only the initial condition when no periods are requested", () => {
    expect(simulateSavings({ ...DEFAULT_INPUT, periods: 0 })).toHaveLength(1);
  });

  it("stays finite throughout the supported maximum scenario", () => {
    const results = simulateSavings({
      contribution: 1_000_000_000,
      annualRate: 1000,
      periods: MAX_PERIODS,
    });
    for (const row of results) {
      expect(Number.isFinite(row.balance)).toBe(true);
      expect(Number.isFinite(row.directBalance)).toBe(true);
      expect(compareBalances(row.balance, row.directBalance).agrees).toBe(true);
    }
  });

  it("validates the complete public input before simulation", () => {
    expect(() =>
      simulateSavings({ ...DEFAULT_INPUT, annualRate: 1001 }),
    ).toThrow(RangeError);
    expect(() =>
      simulateSavings({ ...DEFAULT_INPUT, contribution: -1 }),
    ).toThrow(RangeError);
    expect(() => simulateSavings({ ...DEFAULT_INPUT, periods: 1.2 })).toThrow(
      RangeError,
    );
  });
});
