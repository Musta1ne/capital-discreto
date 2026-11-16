import type { InflationPeriodResult } from "../lib/inflation";
import { formatMoney, formatNumber } from "../lib/format";
import { Math as Equation } from "./Math";

export function InflationResults({
  result,
  baseDate,
  monthlyPercent,
}: {
  result: InflationPeriodResult;
  baseDate: string;
  monthlyPercent: number;
}) {
  // Normalize a display-only negative zero; retain unrounded values in the model.
  const gain = Math.abs(result.realGain) < 0.005 ? 0 : result.realGain;
  return (
    <section
      className="inflation-results panel"
      aria-label="Poder adquisitivo proyectado"
    >
      <div className="inflation-result-heading">
        <div>
          <p className="eyebrow">SALDO AJUSTADO POR INFLACIÓN</p>
          <p className="real-balance" data-testid="real-balance">
            {formatMoney(result.realBalance)}
          </p>
          <p className="inflation-base-date">
            Pesos del {baseDate} · inicio de la proyección
          </p>
        </div>
        <div className="inflation-cumulative">
          <span>Inflación acumulada proyectada</span>
          <strong data-testid="projected-inflation">
            {formatNumber(result.accumulatedInflation * 100, 4)} %
          </strong>
          <span>
            Supuesto: {formatNumber(monthlyPercent, 4)} % mensual constante
          </span>
        </div>
      </div>
      <dl className="inflation-real-metrics">
        <div>
          <dt>Aportes en pesos iniciales</dt>
          <dd data-testid="real-contributed">
            {formatMoney(result.realContributed)}
          </dd>
        </div>
        <div>
          <dt>Resultado en poder adquisitivo</dt>
          <dd
            className={gain < 0 ? "negative-text" : "accent-text"}
            data-testid="real-gain"
          >
            {formatMoney(gain)}
          </dd>
        </div>
      </dl>
      <p className="inflation-result-note">
        Saldo real menos aportes ajustados, ambos expresados en pesos del{" "}
        {baseDate} (fecha inicial). Este resultado compara poder adquisitivo
        bajo los supuestos de la proyección; no representa un débito ni una
        pérdida bancaria nominal.
      </p>
      <details className="inflation-formulas">
        <summary>Cómo se calcula el poder adquisitivo</summary>
        <div className="inflation-formula-grid">
          <div>
            <h3>Un factor de precios por período</h3>
            <Equation
              block
            >{String.raw`\pi_{30}=\left(1+\frac{m}{100}\right)^{360/365}-1`}</Equation>
            <Equation
              block
            >{String.raw`D(0)=1,\qquad D(n)=\prod_{k=1}^{n}(1+\pi(k))`}</Equation>
            <p>
              <b>m</b> es la variación mensual en porcentaje. Se supone un mes
              medio de 365/12 días y crecimiento uniforme de precios; es una
              aproximación para enlazar meses calendario con períodos de 30
              días.
            </p>
            <p>
              La interfaz mantiene constante ese supuesto. La inflación
              acumulada proyectada es <Equation>{String.raw`D(n)-1`}</Equation>.
            </p>
          </div>
          <div>
            <h3>Comparar valores en la misma fecha</h3>
            <Equation block>{String.raw`R(n)=\frac{y(n)}{D(n)}`}</Equation>
            <Equation
              block
            >{String.raw`C_{\mathrm{real}}(n)=\sum_{k=1}^{n}\frac{P(k)}{D(k)}`}</Equation>
            <Equation
              block
            >{String.raw`G_{\mathrm{real}}(n)=R(n)-C_{\mathrm{real}}(n)`}</Equation>
            <p>
              <b>R</b> es el saldo real, <b>P(k)</b> el aporte nominal al cierre
              de k y <b>C real</b> la suma de esos aportes, cada uno expresado
              en pesos iniciales. Descontar todos los aportes con el factor
              final confundiría sus distintas fechas.
            </p>
          </div>
        </div>
        <p>
          El IPC describe precios históricos de una canasta general. Esta
          proyección no conoce la inflación futura ni mide exactamente la
          canasta de consumo de cada persona. No descuenta inflación al interés
          mediante una resta de porcentajes.
        </p>
      </details>
    </section>
  );
}
