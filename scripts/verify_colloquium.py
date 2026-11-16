"""Execute the illustrative colloquium calculations and save their evidence.

Run from any directory with Python 3.11+ and Node 22.14+ on PATH:
    python scripts/verify_colloquium.py

Only Python's standard library is used. JavaScript calls the actual TypeScript
savings functions, with Node's experimental type stripping and no npm packages.
No financial APIs or other network services are contacted.
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from decimal import Decimal, Inexact, Rounded, ROUND_HALF_UP, localcontext
from pathlib import Path
from typing import Any


REPOSITORY = Path(__file__).resolve().parents[1]
OUTPUT = REPOSITORY / "docs" / "presentation-data.json"
ORACLE_PRECISION = 1200
CONTRIBUTION = Decimal("100000")
ANNUAL_PERCENT = Decimal("36.5")
PERIOD_RATE = ANNUAL_PERCENT * Decimal(30) / Decimal(36500)
LAB_RATE_STRINGS = ("0.02", "1e-12", "1e-16", "0")
VERIFICATION_INSTRUCTION_SUMMARY = (
    "Resolver y(0)=0, y(n+1)=1,03y(n)+100000 hasta n=3, "
    "comparar con fórmula por Z y verificar con Python"
)


def exact_decimal_rows(
    contribution: Decimal, rate: Decimal, periods: int
) -> tuple[list[dict[str, Any]], dict[str, bool]]:
    """These finite decimal inputs terminate well inside 1200 digits.

    The traps make a claim of exactness fail visibly if a future input needs
    more precision. This does not make logarithms/exponentials exact.
    """
    with localcontext() as context:
        context.prec = ORACLE_PRECISION
        context.clear_flags()
        context.traps[Inexact] = True
        context.traps[Rounded] = True
        balance = Decimal(0)
        rows = []
        for period in range(periods + 1):
            if period:
                balance = (Decimal(1) + rate) * balance + contribution
            closed = (
                contribution * period
                if rate == 0
                else contribution * (((Decimal(1) + rate) ** period - 1) / rate)
            )
            if balance != closed:
                raise AssertionError("Decimal recurrence and closed form disagree.")
            contributed = contribution * period
            rows.append(
                {
                    "period": period,
                    "balance": balance,
                    "directBalance": closed,
                    "contributed": contributed,
                    "interest": balance - contributed,
                }
            )
        flags = {"inexact": context.flags[Inexact], "rounded": context.flags[Rounded]}
        return rows, flags


def float_methods(contribution: float, rate: float, periods: int) -> dict[str, float]:
    balance = 0.0
    for _ in range(periods):
        balance = (1.0 + rate) * balance + contribution
    if rate == 0:
        usual = stable = contribution * periods
    else:
        usual = contribution * (((1.0 + rate) ** periods - 1.0) / rate)
        # Keep the association used in src/lib/savings.ts. Moving the final
        # division after multiplication can change the last binary digit.
        stable = contribution * (math.expm1(periods * math.log1p(rate)) / rate)
    return {"iterative": balance, "usual": usual, "stable": stable}


def error_against_decimal(actual: float, expected: Decimal) -> dict[str, Any]:
    """Measure the binary float itself, rather than its rounded display string."""
    with localcontext() as context:
        context.prec = ORACLE_PRECISION
        difference = abs(Decimal.from_float(actual) - expected)
        relative = difference / abs(expected) if expected != 0 else Decimal(0)
        return {
            "absolute": float(difference),
            "absoluteDecimal": format(difference, "f"),
            "relative": float(relative),
        }


def method_errors(methods: dict[str, float], oracle: Decimal) -> dict[str, Any]:
    return {method: error_against_decimal(value, oracle) for method, value in methods.items()}


def exact_decimal_json(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            key: format(value, "f") if isinstance(value, Decimal) else value
            for key, value in row.items()
        }
        for row in rows
    ]


def money(value: Decimal | float) -> str:
    decimal = value if isinstance(value, Decimal) else Decimal.from_float(value)
    rounded = decimal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    whole, fraction = f"{abs(rounded):,.2f}".split(".")
    return f"{'-' if rounded < 0 else ''}$ {whole.replace(',', '.')},{fraction}"


def javascript_evidence() -> tuple[dict[str, Any], bool]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node 22.14+ must be installed and available on PATH.")
    source = r"""
import {
  annualToPeriodRate, iterativeBalance, directBalance, naiveBalance,
  simulateSavings, compareBalances,
} from './src/lib/savings.ts';
let serialized = '';
for await (const chunk of process.stdin) serialized += chunk;
const input = JSON.parse(serialized);
function runCase(periods) {
  const savingsInput = {
    contribution: input.contribution,
    annualRate: input.annualRate,
    periods,
  };
  const rate = annualToPeriodRate(savingsInput.annualRate);
  const methods = {
    iterative: iterativeBalance(savingsInput.contribution, rate, periods),
    usual: naiveBalance(savingsInput.contribution, rate, periods),
    stable: directBalance(savingsInput.contribution, rate, periods),
  };
  return {
    periodRate: rate,
    methods,
    rows: simulateSavings(savingsInput),
    comparison: compareBalances(methods.iterative, methods.stable),
  };
}
const lab = input.labRates.map((rate) => {
  const iterative = iterativeBalance(input.contribution, rate, 60);
  const usual = naiveBalance(input.contribution, rate, 60);
  const stable = directBalance(input.contribution, rate, 60);
  return {
    periodRate: rate,
    methods: { iterative, usual, stable },
    comparison: compareBalances(iterative, stable),
  };
});
process.stdout.write(JSON.stringify({
  nodeVersion: process.version,
  caseStudy: runCase(3),
  nominalSeries: runCase(12),
  precisionLab: lab,
}));
"""
    request = {
        "contribution": float(CONTRIBUTION),
        "annualRate": float(ANNUAL_PERCENT),
        "labRates": [float(rate) for rate in LAB_RATE_STRINGS],
    }
    result = subprocess.run(
        [node, "--experimental-strip-types", "--input-type=module", "--eval", source],
        cwd=REPOSITORY,
        input=json.dumps(request),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"JavaScript verification failed:\n{result.stderr}")
    return json.loads(result.stdout), "ExperimentalWarning" in result.stderr


def inflation_evidence(nominal_rows: list[dict[str, Any]]) -> dict[str, Any]:
    monthly_percent = Decimal("10")
    with localcontext() as context:
        context.prec = ORACLE_PRECISION
        log_period_factor = (Decimal(1) + monthly_percent / 100).ln() * 360 / 365
        period_rate = log_period_factor.exp() - 1
        real_contributed = Decimal(0)
        decimal_rows = []
        for row in nominal_rows:
            period = row["period"]
            deflator = (log_period_factor * period).exp()
            if period:
                real_contributed += CONTRIBUTION / deflator
            real_balance = row["balance"] / deflator
            decimal_rows.append(
                {
                    "period": period,
                    "priceIndex": deflator,
                    "realBalance": real_balance,
                    "realContributed": real_contributed,
                    "realGain": real_balance - real_contributed,
                    "accumulatedInflation": deflator - 1,
                }
            )

    monthly_float = float(monthly_percent)
    rate_float = math.expm1(math.log1p(monthly_float / 100) * (360 / 365))
    accumulated_log = 0.0
    real_contributed_float = 0.0
    float_rows = []
    for period in range(4):
        if period:
            accumulated_log += math.log1p(rate_float)
        deflator = math.exp(accumulated_log)
        if period:
            real_contributed_float += float(CONTRIBUTION) / deflator
        nominal = float_methods(float(CONTRIBUTION), float(PERIOD_RATE), period)["iterative"]
        real_balance = nominal / deflator
        float_rows.append(
            {
                "period": period,
                "priceIndex": deflator,
                "nominalBalance": nominal,
                "realBalance": real_balance,
                "realContributed": real_contributed_float,
                "realGain": real_balance - real_contributed_float,
                "accumulatedInflation": math.expm1(accumulated_log),
            }
        )

    final_decimal = decimal_rows[-1]
    final_float = float_rows[-1]
    # Decimal transcendental results are references, not finite exact decimals.
    # Preserve 50 significant digits for the slides' source data, with the
    # computation precision and approximation status stated explicitly.
    reference_rows = [
        {
            key: format(value, ".50g") if isinstance(value, Decimal) else value
            for key, value in row.items()
        }
        for row in decimal_rows
    ]
    return {
        "illustrative": True,
        "usesObservedIPC": False,
        "baseDate": "2026-11-16",
        "baseDateMeaning": "Fecha base pedagógica del ejemplo, no fecha de vigencia de un IPC.",
        "monthlyPercent": 10,
        "meanMonthDays": 365 / 12,
        "periodRate": rate_float,
        "periodPercent": rate_float * 100,
        "periodRateHighPrecision": format(period_rate, ".50g"),
        "referenceIsExact": False,
        "referencePrecisionDigits": ORACLE_PRECISION,
        "serializedReferenceSignificantDigits": 50,
        "rows": float_rows,
        "highPrecisionReferenceRows": reference_rows,
        "final": {
            **final_float,
            "accumulatedInflationPercent": final_float["accumulatedInflation"] * 100,
            "errorsAgainstHighPrecisionReference": {
                field: error_against_decimal(final_float[field], final_decimal[field])
                for field in ("realBalance", "realContributed", "realGain")
            },
        },
        "display": {
            "nominalBalance": money(nominal_rows[-1]["balance"]),
            "realBalance": money(final_decimal["realBalance"]),
            "realContributed": money(final_decimal["realContributed"]),
            "purchasingPowerResult": money(final_decimal["realGain"]),
        },
        "formulas": {
            "periodInflation": "pi30 = (1 + m/100)^(360/365) - 1",
            "priceIndex": "D[0]=1; D[n]=product(1+pi[k]), k=1..n",
            "realBalance": "R[n]=y[n]/D[n]",
            "realContributed": "C[n]=sum(P[k]/D[k]), k=1..n",
            "purchasingPowerResult": "G[n]=R[n]-C[n]",
        },
        "interpretation": (
            "El resultado negativo compara poder de compra frente a los aportes "
            "ajustados individualmente. No representa una pérdida bancaria nominal."
        ),
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    checks: list[dict[str, Any]] = []

    def verify(name: str, passed: bool) -> None:
        checks.append({"name": name, "passed": bool(passed)})
        if not passed:
            raise AssertionError(name)

    javascript, experimental_warning = javascript_evidence()
    decimal_case, case_flags = exact_decimal_rows(CONTRIBUTION, PERIOD_RATE, 3)
    decimal_series, series_flags = exact_decimal_rows(CONTRIBUTION, PERIOD_RATE, 12)
    verify("exact_period_rate_is_0.03", PERIOD_RATE == Decimal("0.03"))
    verify(
        "manual_balances_are_0_100000_203000_309090",
        [row["balance"] for row in decimal_case]
        == [Decimal("0"), Decimal("100000"), Decimal("203000"), Decimal("309090")],
    )
    verify("manual_total_contributed_is_300000", decimal_case[-1]["contributed"] == 300000)
    verify("manual_total_interest_is_9090", decimal_case[-1]["interest"] == 9090)
    verify("first_deposit_has_no_interest", decimal_case[1]["interest"] == 0)
    verify("case_decimal_has_no_rounding", not any(case_flags.values()))
    verify("series_decimal_has_no_rounding", not any(series_flags.values()))

    python_case = float_methods(float(CONTRIBUTION), float(PERIOD_RATE), 3)
    verify("javascript_case_agrees_within_tolerance", javascript["caseStudy"]["comparison"]["agrees"])
    for runtime, methods in (("python", python_case), ("javascript", javascript["caseStudy"]["methods"])):
        for method, value in methods.items():
            verify(f"{runtime}_{method}_case_matches_manual_to_micro_peso", abs(value - 309090) < 1e-6)

    chart_rows = []
    for reference, js_row in zip(decimal_series, javascript["nominalSeries"]["rows"], strict=True):
        period = reference["period"]
        methods = float_methods(float(CONTRIBUTION), float(PERIOD_RATE), period)
        verify(
            f"series_period_{period}_python_javascript_agree",
            abs(methods["iterative"] - js_row["balance"]) < 1e-6,
        )
        chart_rows.append(
            {
                "period": period,
                "days": 30 * period,
                "balance": js_row["balance"],
                "directBalance": js_row["directBalance"],
                "contributed": js_row["contributed"],
                "interest": js_row["interest"],
                "pythonMethods": methods,
                "decimalBalance": format(reference["balance"], "f"),
                "decimalContributed": format(reference["contributed"], "f"),
                "pythonVsJavascriptIterativeDifference": abs(methods["iterative"] - js_row["balance"]),
                "pythonIterativeErrorAgainstDecimal": error_against_decimal(methods["iterative"], reference["balance"]),
            }
        )

    laboratory = []
    for rate_text, js_case in zip(LAB_RATE_STRINGS, javascript["precisionLab"], strict=True):
        rate_decimal = Decimal(rate_text)
        oracle_rows, flags = exact_decimal_rows(CONTRIBUTION, rate_decimal, 60)
        oracle = oracle_rows[-1]["balance"]
        methods = float_methods(float(CONTRIBUTION), float(rate_decimal), 60)
        verify(f"lab_{rate_text}_decimal_has_no_rounding", not any(flags.values()))
        verify(f"lab_{rate_text}_javascript_iterative_stable_agree", js_case["comparison"]["agrees"])
        laboratory.append(
            {
                "periodRateInputDecimal": rate_text,
                "periodRate": float(rate_decimal),
                "rateUnit": "Fracción por período de 30 días; no es TNA ni porcentaje.",
                "decimalOracle": format(oracle, "f"),
                "decimalOracleExact": not any(flags.values()),
                "decimalFlags": flags,
                "python": {
                    "methods": methods,
                    "errorsAgainstDecimal": method_errors(methods, oracle),
                    "usualStableDifference": abs(methods["usual"] - methods["stable"]),
                },
                "javascript": {
                    "methods": js_case["methods"],
                    "errorsAgainstDecimal": method_errors(js_case["methods"], oracle),
                    "usualStableDifference": abs(js_case["methods"]["usual"] - js_case["methods"]["stable"]),
                    "iterativeStableComparison": js_case["comparison"],
                },
                "pythonVsJavascriptDifferences": {
                    method: abs(methods[method] - js_case["methods"][method])
                    for method in methods
                },
            }
        )

    verify("tiny_rate_naive_formula_really_returns_zero", laboratory[2]["python"]["methods"]["usual"] == 0)
    verify("tiny_rate_oracle_remains_positive", Decimal(laboratory[2]["decimalOracle"]) > 6000000)
    inflation = inflation_evidence(decimal_case)
    verify("inflation_real_balance_rounds_to_233135.26", inflation["display"]["realBalance"] == "$ 233.135,26")
    verify("inflation_real_contributed_rounds_to_249314.91", inflation["display"]["realContributed"] == "$ 249.314,91")
    verify("inflation_result_rounds_to_minus_16179.65", inflation["display"]["purchasingPowerResult"] == "-$ 16.179,65")
    verify("inflation_first_end_deposit_real_result_is_zero", inflation["rows"][1]["realGain"] == 0)

    executed = datetime.now(timezone.utc)
    artifact = {
        "metadata": {
            "generatedBy": "scripts/verify_colloquium.py",
            "reproduceWith": "python scripts/verify_colloquium.py",
            "executedAtUTC": executed.isoformat(),
            "executedAtLocal": executed.astimezone().isoformat(),
            "pythonVersion": sys.version.split()[0],
            "nodeVersion": javascript["nodeVersion"],
            "nodeExperimentalTypeStrippingWarningObserved": experimental_warning,
            "javascriptSource": "src/lib/savings.ts",
            "decimalPrecisionDigits": ORACLE_PRECISION,
            "floatErrorDefinition": "abs(Decimal.from_float(actual_float) - decimal_oracle)",
            "exactnessScope": (
                "Los oráculos de las recurrencias con entradas decimales finitas "
                "son exactos y sus flags Inexact/Rounded fueron comprobados. "
                "La referencia de inflación usa logaritmos y exponenciales de alta "
                "precisión y es aproximada. Python y JavaScript se ejecutan por separado."
            ),
            "usesNetwork": False,
            "allInputsIllustrative": True,
            "verificationInstructionSummary": VERIFICATION_INSTRUCTION_SUMMARY,
            "verificationInstructionSummaryNote": (
                "Síntesis de la tarea de verificación asistida. No es una cita "
                "literal del usuario ni evidencia de un prompt aparte. Tampoco "
                "acredita una tasa bancaria."
            ),
        },
        "caseStudy": {
            "inputs": {"contribution": 100000, "annualRatePercent": 36.5, "periodRateFraction": 0.03, "periods": 3},
            "decimalOracleRows": exact_decimal_json(decimal_case),
            "decimalFlags": case_flags,
            "python": {"methods": python_case, "errorsAgainstDecimal": method_errors(python_case, decimal_case[-1]["balance"])},
            "javascript": {
                **javascript["caseStudy"],
                "errorsAgainstDecimal": method_errors(javascript["caseStudy"]["methods"], decimal_case[-1]["balance"]),
            },
            "pythonVsJavascriptDifferences": {
                method: abs(python_case[method] - javascript["caseStudy"]["methods"][method])
                for method in python_case
            },
            "exactSummary": {"balance": "309090", "contributed": "300000", "interest": "9090"},
            "display": {"balance": "$ 309.090,00", "contributed": "$ 300.000,00", "interest": "$ 9.090,00"},
        },
        "nominalSeries": {
            "inputs": {"contribution": 100000, "annualRatePercent": 36.5, "periodRateFraction": 0.03, "periods": 12},
            "decimalFlags": series_flags,
            "rows": chart_rows,
        },
        "precisionLab": {"contribution": 100000, "periods": 60, "rows": laboratory},
        "inflationExample": inflation,
        "verification": {"passed": all(check["passed"] for check in checks), "checkCount": len(checks), "checks": checks},
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(artifact, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Verificaciones aprobadas: {len(checks)}")
    print(f"Datos: {OUTPUT.relative_to(REPOSITORY).as_posix()}")
    print(f"Caso nominal exacto: saldo {artifact['caseStudy']['display']['balance']}; intereses $ 9.090,00")
    print("Caso inflación ilustrativa: " + json.dumps(inflation["display"], ensure_ascii=False))
    for row in laboratory:
        print(f"Laboratorio i={row['periodRateInputDecimal']}: Python " + repr(row["python"]["methods"]) + "; JS " + repr(row["javascript"]["methods"]))


if __name__ == "__main__":
    main()
