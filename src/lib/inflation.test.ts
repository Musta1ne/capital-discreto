import { describe, expect, it } from "vitest";
import {
  adjustSavingsForInflation,
  monthlyToPeriodInflation,
} from "./inflation";
import { simulateSavings } from "./savings";
import type { PeriodResult } from "./savings";

function exampleRows(): PeriodResult[] {
  return [0, 100, 200].map((balance, period) => ({
    period,
    contributed: 100 * period,
    interest: 0,
    balance,
    directBalance: balance,
  }));
}

describe("monthlyToPeriodInflation", () => {
  it("keeps zero inflation exactly zero", () => {
    expect(monthlyToPeriodInflation(0)).toBe(0);
    expect(monthlyToPeriodInflation(-0)).toBe(0);
  });

  it("uses a 365/12-day mean month instead of identifying it with 30 days", () => {
    const rate = monthlyToPeriodInflation(3);
    expect(rate).toBeCloseTo(1.03 ** (360 / 365) - 1, 14);
    expect(rate).toBeLessThan(0.03);
    expect(rate).toBeGreaterThan(0.029);
  });

  it("has the same yearly composition as twelve mean months over 365 days", () => {
    const rate = monthlyToPeriodInflation(3.2);
    expect((1 + rate) ** (365 / 30)).toBeCloseTo(1.032 ** 12, 13);
  });

  it("makes twelve 30-day periods represent 360 days rather than twelve months", () => {
    const rate = monthlyToPeriodInflation(3.2);
    expect((1 + rate) ** 12).toBeLessThan(1.032 ** 12);
  });

  it("converts deflation while preserving a positive price factor", () => {
    const rate = monthlyToPeriodInflation(-2);
    expect(rate).toBeLessThan(0);
    expect(rate).toBeGreaterThan(-0.02);
    expect(1 + rate).toBeGreaterThan(0);
  });

  it.each([-99, 1000])("accepts the monthly domain boundary %s", (monthly) => {
    const rate = monthlyToPeriodInflation(monthly);
    expect(Number.isFinite(rate)).toBe(true);
    expect(rate).toBeGreaterThanOrEqual(-0.99);
    expect(rate).toBeLessThanOrEqual(10);
  });

  it("preserves small nonzero inflation without cancellation", () => {
    const rate = monthlyToPeriodInflation(1e-16);
    expect(rate).toBeGreaterThan(0);
    expect(rate / 1e-18).toBeCloseTo(360 / 365, 14);
  });

  it.each([-99.01, -100, -101, 1000.01, Number.NaN, Infinity, -Infinity])(
    "rejects out-of-domain monthly inflation %s",
    (monthly) => {
      expect(() => monthlyToPeriodInflation(monthly)).toThrow(RangeError);
    },
  );
});

describe("adjustSavingsForInflation", () => {
  it("leaves the nominal calculation unchanged when inflation is zero", () => {
    const rows = simulateSavings({
      contribution: 100_000,
      annualRate: 36.5,
      periods: 12,
    });
    const adjusted = adjustSavingsForInflation(rows, 0);
    adjusted.forEach((row, index) => {
      expect(row.priceIndex).toBe(1);
      expect(row.accumulatedInflation).toBe(0);
      expect(row.realBalance).toBe(rows[index].balance);
      expect(row.realContributed).toBe(rows[index].contributed);
      expect(row.realGain).toBe(rows[index].interest);
      expect(row.balance).toBe(rows[index].balance);
      expect(row.directBalance).toBe(rows[index].directBalance);
    });
  });

  it("accepts rounding-sized negative nominal interest from fractional contributions", () => {
    const rows = simulateSavings({
      contribution: 0.1,
      annualRate: 0,
      periods: 60,
    });
    expect(rows.some((row) => row.interest < 0)).toBe(true);
    const adjusted = adjustSavingsForInflation(rows, 0);
    expect(adjusted).toHaveLength(61);
    adjusted.forEach((row, index) => {
      expect(row.balance).toBe(rows[index].balance);
      expect(row.interest).toBe(rows[index].interest);
      expect(row.realBalance).toBe(rows[index].balance);
      expect(row.realContributed).toBeCloseTo(rows[index].contributed, 12);
      expect(row.realGain).toBeCloseTo(rows[index].interest, 12);
    });
  });

  it("discounts every end-of-period contribution at its own price index", () => {
    const adjusted = adjustSavingsForInflation(exampleRows(), 0.1);
    expect(adjusted[0]).toMatchObject({
      priceIndex: 1,
      realBalance: 0,
      realContributed: 0,
      realGain: 0,
      accumulatedInflation: 0,
    });
    expect(adjusted[1].priceIndex).toBeCloseTo(1.1, 14);
    expect(adjusted[2].priceIndex).toBeCloseTo(1.21, 14);
    expect(adjusted[2].realBalance).toBeCloseTo(200 / 1.21, 12);
    expect(adjusted[2].realContributed).toBeCloseTo(100 / 1.1 + 100 / 1.21, 12);
    expect(adjusted[2].realGain).toBeCloseTo(-1000 / 121, 12);
    expect(adjusted[2].realGain).toBeLessThan(0);
    // Discounting all P*n by D[n] would incorrectly erase the first contribution's loss.
    expect(adjusted[2].realContributed).not.toBeCloseTo(200 / 1.21, 6);
    expect(adjusted[2].accumulatedInflation).toBeCloseTo(0.21, 14);
  });

  it("does not accrue a real gain or loss on the contribution just made", () => {
    const [initial, first] = adjustSavingsForInflation(
      exampleRows().slice(0, 2),
      0.2,
    );
    expect(initial.priceIndex).toBe(1);
    expect(first.realBalance).toBeCloseTo(100 / 1.2, 12);
    expect(first.realContributed).toBe(first.realBalance);
    expect(first.realGain).toBe(0);
  });

  it("handles different inflation rates in successive periods", () => {
    const adjusted = adjustSavingsForInflation(exampleRows(), [0.1, 0.2]);
    expect(adjusted[2].priceIndex).toBeCloseTo(1.32, 14);
    expect(adjusted[2].realBalance).toBeCloseTo(200 / 1.32, 12);
    expect(adjusted[2].realContributed).toBeCloseTo(100 / 1.1 + 100 / 1.32, 12);
    expect(adjusted[2].accumulatedInflation).toBeCloseTo(0.32, 14);
  });

  it("allows deflation and the resulting gain of purchasing power", () => {
    const adjusted = adjustSavingsForInflation(exampleRows(), -0.1);
    expect(adjusted[2].priceIndex).toBeCloseTo(0.81, 14);
    expect(adjusted[2].realBalance).toBeCloseTo(200 / 0.81, 12);
    expect(adjusted[2].realContributed).toBeCloseTo(100 / 0.9 + 100 / 0.81, 12);
    expect(adjusted[2].realGain).toBeCloseTo(1000 / 81, 12);
    expect(adjusted[2].realGain).toBeGreaterThan(0);
    expect(adjusted[2].accumulatedInflation).toBeCloseTo(-0.19, 14);
  });

  it("handles a changing contribution without discounting the cumulative total", () => {
    const rows = exampleRows();
    rows[2] = {
      ...rows[2],
      contributed: 150,
      balance: 150,
      directBalance: 150,
    };
    const adjusted = adjustSavingsForInflation(rows, 0.1);
    expect(adjusted[2].realContributed).toBeCloseTo(100 / 1.1 + 50 / 1.21, 12);
  });

  it("has no real gain when the investment rate equals inflation", () => {
    // A 36.5% TNA gives exactly the illustrative 3% rate per 30-day period.
    const rows = simulateSavings({
      contribution: 100_000,
      annualRate: 36.5,
      periods: 60,
    });
    const adjusted = adjustSavingsForInflation(rows, 0.03);
    adjusted.forEach((row) => {
      const tolerance = 1e-6 + 1e-12 * Math.abs(row.realContributed);
      expect(Math.abs(row.realGain)).toBeLessThanOrEqual(tolerance);
      expect(
        Math.abs(row.realBalance - row.realContributed),
      ).toBeLessThanOrEqual(tolerance);
    });
  });

  it("keeps zero savings at zero even while prices change", () => {
    const rows = simulateSavings({
      contribution: 0,
      annualRate: 30,
      periods: 2,
    });
    const adjusted = adjustSavingsForInflation(rows, [0.1, -0.2]);
    adjusted.forEach((row) => {
      expect(row.realBalance).toBe(0);
      expect(row.realContributed).toBe(0);
      expect(row.realGain).toBe(0);
    });
    expect(adjusted[2].priceIndex).toBeCloseTo(0.88, 14);
  });

  it("supports the initial condition with an empty array of noninitial rates", () => {
    const initial = exampleRows().slice(0, 1);
    expect(adjustSavingsForInflation(initial, [])).toEqual([
      {
        ...initial[0],
        priceIndex: 1,
        realBalance: 0,
        realContributed: 0,
        realGain: 0,
        accumulatedInflation: 0,
      },
    ]);
    expect(adjustSavingsForInflation(initial, 0)).toHaveLength(1);
  });

  it("rejects an empty savings series because its initial condition is absent", () => {
    expect(() => adjustSavingsForInflation([], [])).toThrow(RangeError);
  });

  it("rejects sparse savings rows instead of skipping a missing initial condition", () => {
    expect(() => adjustSavingsForInflation(Array<PeriodResult>(3), 0)).toThrow(
      RangeError,
    );
  });

  it("rejects sparse rate arrays instead of generating NaN", () => {
    expect(() =>
      adjustSavingsForInflation(exampleRows(), Array<number>(2)),
    ).toThrow(RangeError);
  });

  it.each([[], [0.1], [0.1, 0.2, 0.3]])(
    "rejects an array with the wrong number of rates: %s",
    (...rates) => {
      expect(() => adjustSavingsForInflation(exampleRows(), rates)).toThrow(
        RangeError,
      );
    },
  );

  it.each([-0.99001, -1, -2, 10.001, Number.NaN, Infinity, -Infinity])(
    "rejects an invalid period rate %s in either input form",
    (rate) => {
      expect(() => adjustSavingsForInflation(exampleRows(), rate)).toThrow(
        RangeError,
      );
      expect(() => adjustSavingsForInflation(exampleRows(), [0, rate])).toThrow(
        RangeError,
      );
    },
  );

  it.each([-0.99, 10])(
    "keeps the supported extremes finite for 60 periods: %s",
    (rate) => {
      const rows = simulateSavings({
        contribution: 1e9,
        annualRate: 1000,
        periods: 60,
      });
      const adjusted = adjustSavingsForInflation(rows, rate);
      expect(adjusted).toHaveLength(61);
      adjusted.forEach((row) => {
        expect(row.priceIndex).toBeGreaterThan(0);
        for (const value of [
          row.priceIndex,
          row.realBalance,
          row.realContributed,
          row.realGain,
          row.accumulatedInflation,
        ]) {
          expect(Number.isFinite(value)).toBe(true);
        }
      });
    },
  );

  it.each([1, 1.5, -1, Number.NaN, Infinity])(
    "rejects a nonsequential period identifier %s",
    (period) => {
      const rows = exampleRows();
      rows[2] = { ...rows[2], period };
      expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
    },
  );

  it("requires the first period to be zero", () => {
    expect(() => adjustSavingsForInflation(exampleRows().slice(1), 0)).toThrow(
      RangeError,
    );
  });

  it("requires all initial amounts to be zero", () => {
    for (const field of [
      "contributed",
      "balance",
      "directBalance",
      "interest",
    ] as const) {
      const rows = exampleRows();
      rows[0] = { ...rows[0], [field]: 1 };
      expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
    }
  });

  it.each([-1, Number.NaN, Infinity, -Infinity])(
    "rejects nonfinite or negative nominal amounts %s",
    (value) => {
      for (const field of [
        "contributed",
        "balance",
        "directBalance",
        "interest",
      ] as const) {
        const rows = exampleRows();
        rows[1] = { ...rows[1], [field]: value };
        expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
      }
    },
  );

  it("rejects decreasing cumulative contributions", () => {
    const rows = exampleRows();
    rows[2] = { ...rows[2], contributed: 99 };
    expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
  });

  it("rejects contributions exceeding the original per-period limit", () => {
    const rows = exampleRows();
    rows[1] = { ...rows[1], contributed: 1e9 + 1 };
    rows[2] = { ...rows[2], contributed: 2e9 + 2 };
    expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
  });

  it("rejects series longer than the 60-period horizon", () => {
    const rows = Array.from({ length: 62 }, (_, period) => ({
      period,
      contributed: 0,
      balance: 0,
      directBalance: 0,
      interest: 0,
    }));
    expect(() => adjustSavingsForInflation(rows, 0)).toThrow(RangeError);
  });

  it("throws instead of exposing an infinite inflation-adjusted balance", () => {
    const rows = exampleRows().slice(0, 2);
    rows[1] = {
      ...rows[1],
      balance: Number.MAX_VALUE,
      directBalance: Number.MAX_VALUE,
      interest: Number.MAX_VALUE,
    };
    expect(() => adjustSavingsForInflation(rows, -0.99)).toThrow(RangeError);
  });

  it("does not lose the accumulated inflation near zero", () => {
    const adjusted = adjustSavingsForInflation(exampleRows(), 1e-16);
    expect(adjusted[2].accumulatedInflation).toBeGreaterThan(0);
    expect(adjusted[2].accumulatedInflation / 1e-16).toBeCloseTo(2, 14);
  });

  it("preserves input rows and rates without mutation", () => {
    const rows = Object.freeze(exampleRows().map((row) => Object.freeze(row)));
    const rates = Object.freeze([0.1, 0.2]);
    const before = JSON.stringify(rows);
    const adjusted = adjustSavingsForInflation(rows, rates);
    expect(JSON.stringify(rows)).toBe(before);
    expect(rates).toEqual([0.1, 0.2]);
    expect(adjusted[1]).not.toBe(rows[1]);
  });
});
