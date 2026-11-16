export type SavingsInput = {
  contribution: number;
  annualRate: number;
  periods: number;
};

export type PeriodResult = {
  period: number;
  contributed: number;
  /** Total interest accumulated through the end of this period. */
  interest: number;
  balance: number;
  directBalance: number;
};

export type Comparison = {
  absoluteDifference: number;
  relativeDifference: number;
  tolerance: number;
  agrees: boolean;
};

export const MAX_PERIODS = 60;
export const DEFAULT_INPUT: SavingsInput = {
  contribution: 100_000,
  annualRate: 30,
  periods: 12,
};

const MAX_CONTRIBUTION = 1_000_000_000;
const MAX_ANNUAL_RATE = 1_000;
const DAYS_PER_PERIOD = 30;
const DAYS_PER_YEAR = 365;
const MAX_PERIOD_RATE =
  (MAX_ANNUAL_RATE / 100) * (DAYS_PER_PERIOD / DAYS_PER_YEAR);
const ABSOLUTE_TOLERANCE = 1e-6;
const RELATIVE_TOLERANCE = 1e-12;

function validateRange(value: number, maximum: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    throw new RangeError(
      `${name} must be finite and between 0 and ${maximum}.`,
    );
  }
}

function validateCalculation(
  contribution: number,
  periodRate: number,
  periods: number,
): void {
  validateRange(contribution, MAX_CONTRIBUTION, "Contribution");
  validateRange(periodRate, MAX_PERIOD_RATE, "Period rate");
  validateRange(periods, MAX_PERIODS, "Periods");
  if (!Number.isInteger(periods)) {
    throw new RangeError("Periods must be an integer.");
  }
}

/** Nominal annual percentage to the effective rate of a 30-day placement. */
export function annualToPeriodRate(annualRate: number): number {
  validateRange(annualRate, MAX_ANNUAL_RATE, "Annual rate");
  return (annualRate / 100) * (DAYS_PER_PERIOD / DAYS_PER_YEAR);
}

/** Capitalize the previous balance, then make the contribution at period end. */
export function iterativeBalance(
  contribution: number,
  periodRate: number,
  periods: number,
): number {
  validateCalculation(contribution, periodRate, periods);
  let balance = 0;
  for (let period = 1; period <= periods; period += 1) {
    balance = (1 + periodRate) * balance + contribution;
  }
  return balance;
}

/** Evaluate the closed form without subtracting nearly equal numbers. */
export function directBalance(
  contribution: number,
  periodRate: number,
  periods: number,
): number {
  validateCalculation(contribution, periodRate, periods);
  if (periods === 0 || contribution === 0) return 0;
  if (periodRate === 0) return contribution * periods;

  const accumulationFactor =
    Math.expm1(periods * Math.log1p(periodRate)) / periodRate;
  return contribution * accumulationFactor;
}

/** Deliberately naive evaluation, retained for the numerical precision lesson. */
export function naiveBalance(
  contribution: number,
  periodRate: number,
  periods: number,
): number {
  validateCalculation(contribution, periodRate, periods);
  if (periods === 0 || contribution === 0) return 0;
  if (periodRate === 0) return contribution * periods;
  return contribution * (((1 + periodRate) ** periods - 1) / periodRate);
}

export function compareBalances(a: number, b: number): Comparison {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError("Compared balances must be finite.");
  }
  const absoluteDifference = Math.abs(a - b);
  if (!Number.isFinite(absoluteDifference)) {
    throw new RangeError("The difference between balances must be finite.");
  }
  const scale = Math.max(Math.abs(a), Math.abs(b));
  const tolerance = ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE * scale;
  return {
    absoluteDifference,
    relativeDifference: scale === 0 ? 0 : absoluteDifference / scale,
    tolerance,
    agrees: absoluteDifference <= tolerance,
  };
}

/** Include n = 0 so the graph and table expose the initial condition. */
export function simulateSavings(input: SavingsInput): PeriodResult[] {
  const { contribution, annualRate, periods } = input;
  const periodRate = annualToPeriodRate(annualRate);
  validateCalculation(contribution, periodRate, periods);

  const results: PeriodResult[] = [];
  let balance = 0;
  for (let period = 0; period <= periods; period += 1) {
    if (period > 0) {
      balance = (1 + periodRate) * balance + contribution;
    }
    const contributed = contribution * period;
    results.push({
      period,
      contributed,
      interest: balance - contributed,
      balance,
      directBalance: directBalance(contribution, periodRate, period),
    });
  }
  return results;
}
