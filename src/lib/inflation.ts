import { compareBalances, MAX_PERIODS } from "./savings";
import type { PeriodResult } from "./savings";

export type InflationPeriodResult = PeriodResult & {
  priceIndex: number;
  realBalance: number;
  realContributed: number;
  realGain: number;
  /** Fractional change in the price index, not a percentage. */
  accumulatedInflation: number;
};

const MAX_CONTRIBUTION = 1_000_000_000;
const MIN_MONTHLY_PERCENT = -99;
const MAX_MONTHLY_PERCENT = 1000;
const MIN_PERIOD_INFLATION = -0.99;
const MAX_PERIOD_INFLATION = 10;

/**
 * Convert a monthly percentage under an explicit 365/12-day mean-month
 * convention. This is a time conversion, not a forecast of future inflation.
 */
export function monthlyToPeriodInflation(monthlyPercent: number): number {
  if (
    !Number.isFinite(monthlyPercent) ||
    monthlyPercent < MIN_MONTHLY_PERCENT ||
    monthlyPercent > MAX_MONTHLY_PERCENT
  ) {
    throw new RangeError(
      "Monthly inflation must be finite and between -99 and 1000 percent.",
    );
  }
  if (monthlyPercent === 0) return 0;
  return Math.expm1(Math.log1p(monthlyPercent / 100) * (360 / 365));
}

function validateInflation(value: number): void {
  if (
    !Number.isFinite(value) ||
    value < MIN_PERIOD_INFLATION ||
    value > MAX_PERIOD_INFLATION
  ) {
    throw new RangeError(
      "Period inflation must be finite and between -0.99 and 10 as a fraction.",
    );
  }
}

function validateAmount(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and nonnegative.`);
  }
}

function validateRows(rows: readonly PeriodResult[]): void {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new RangeError("Savings rows must include the initial period.");
  }
  if (rows.length > MAX_PERIODS + 1) {
    throw new RangeError(`Savings rows cannot exceed ${MAX_PERIODS} periods.`);
  }

  let previousContributed = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || !Number.isInteger(row.period) || row.period !== index) {
      throw new RangeError(
        "Savings periods must be sequential integers starting at zero.",
      );
    }
    validateAmount(row.contributed, "Contributed amount");
    validateAmount(row.balance, "Nominal balance");
    validateAmount(row.directBalance, "Direct nominal balance");
    // The nominal engine can produce a tiny negative balance - contributed
    // through floating-point cancellation, even at a zero investment rate.
    // Preserve that value; it is not an input to the purchasing-power model.
    const interestTolerance = compareBalances(
      row.balance,
      row.contributed,
    ).tolerance;
    if (!Number.isFinite(row.interest) || row.interest < -interestTolerance) {
      throw new RangeError(
        "Nominal accumulated interest must be finite and nonnegative within rounding tolerance.",
      );
    }
    if (
      index === 0 &&
      (row.contributed !== 0 ||
        row.balance !== 0 ||
        row.directBalance !== 0 ||
        row.interest !== 0)
    ) {
      throw new RangeError("All amounts in the initial period must be zero.");
    }

    const contribution = row.contributed - previousContributed;
    if (
      contribution < 0 ||
      contribution > MAX_CONTRIBUTION ||
      row.contributed > index * MAX_CONTRIBUTION
    ) {
      throw new RangeError(
        "Contributions must be nondecreasing and cannot exceed 1000000000 per period.",
      );
    }
    previousContributed = row.contributed;
  }
}

/**
 * Express balances and each end-of-period contribution in purchasing power
 * of period zero. Contribution k is discounted by D[k], not by D[final].
 * A rate array describes successive 30-day periods and excludes period zero.
 */
export function adjustSavingsForInflation(
  rows: readonly PeriodResult[],
  periodInflation: number | readonly number[],
): InflationPeriodResult[] {
  validateRows(rows);

  let inflationRates: readonly number[];
  if (typeof periodInflation === "number") {
    validateInflation(periodInflation);
    inflationRates = Array<number>(rows.length - 1).fill(periodInflation);
  } else {
    if (
      !Array.isArray(periodInflation) ||
      periodInflation.length !== rows.length - 1
    ) {
      throw new RangeError(
        "Provide exactly one inflation rate per noninitial period.",
      );
    }
    for (const rate of periodInflation) validateInflation(rate);
    inflationRates = periodInflation;
  }

  let accumulatedLog = 0;
  let realContributed = 0;
  let previousContributed = 0;
  return rows.map((row, index) => {
    if (index > 0) {
      accumulatedLog += Math.log1p(inflationRates[index - 1]);
    }
    const priceIndex = Math.exp(accumulatedLog);
    const realBalance = row.balance / priceIndex;
    const contribution = row.contributed - previousContributed;
    realContributed += contribution / priceIndex;
    const realGain = realBalance - realContributed;
    const accumulatedInflation = Math.expm1(accumulatedLog);

    if (
      !Number.isFinite(priceIndex) ||
      priceIndex <= 0 ||
      !Number.isFinite(realBalance) ||
      !Number.isFinite(realContributed) ||
      !Number.isFinite(realGain) ||
      !Number.isFinite(accumulatedInflation)
    ) {
      throw new RangeError(
        "Inflation-adjusted results exceed the finite numeric range.",
      );
    }

    previousContributed = row.contributed;
    return {
      ...row,
      priceIndex,
      realBalance,
      realContributed,
      realGain,
      accumulatedInflation,
    };
  });
}
