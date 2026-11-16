import { useState } from "react";
import {
  compareBalances,
  directBalance,
  iterativeBalance,
  naiveBalance,
} from "../lib/savings";
import { formatMoney, formatScientific } from "../lib/format";
import { Math as Equation } from "./Math";

const presets = [
  { label: "Tasa habitual", rate: 0.02, text: "i = 0,02" },
  { label: "Tasa cercana a cero", rate: 1e-12, text: "i = 10⁻¹²" },
  { label: "Límite de precisión", rate: 1e-16, text: "i = 10⁻¹⁶" },
  { label: "Sin interés", rate: 0, text: "i = 0" },
];

export function PrecisionLab() {
  const [preset, setPreset] = useState(1);
  const periodRate = presets[preset].rate;
  const contribution = 100_000;
  const periods = 60;
  const iterative = iterativeBalance(contribution, periodRate, periods);
  const direct = directBalance(contribution, periodRate, periods);
  const naive = naiveBalance(contribution, periodRate, periods);
  const comparison = compareBalances(iterative, direct);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPERIMENTO REPRODUCIBLE</p>
          <h1>La misma fórmula. Distinta precisión.</h1>
          <p>
            Explorá qué pasa cuando una computadora resta dos números casi
            iguales.
          </p>
        </div>
        <span className="quiet-badge">Aritmética IEEE 754 · binary64</span>
      </div>
      <div className="lab-presets" aria-label="Tasa del experimento">
        {presets.map((item, index) => (
          <button
            className={`preset-button ${preset === index ? "active" : ""}`}
            key={item.label}
            aria-pressed={preset === index}
            onClick={() => setPreset(index)}
          >
            <span>{item.label}</span>
            <strong>{item.text}</strong>
          </button>
        ))}
      </div>
      <p className="muted experiment-caption">
        Caso sintético independiente del simulador: aporte de $100.000, 60
        períodos. La tasa indicada es por período; estos valores extremos
        permiten estudiar redondeo.
      </p>
      <div className="method-grid">
        <article className="content-card">
          <p className="eyebrow">01 · ECUACIÓN EN DIFERENCIAS</p>
          <h2>Período a período</h2>
          <Equation block>{String.raw`y(n)=(1+i)y(n-1)+P`}</Equation>
          <p className="method-value">{formatMoney(iterative)}</p>
          <code>{iterative.toPrecision(17)}</code>
          <p className="muted small">
            Acumula los efectos del redondeo en cada paso.
          </p>
        </article>
        <article className="content-card">
          <p className="eyebrow">02 · EVALUACIÓN USUAL</p>
          <h2>Potencia y resta</h2>
          <Equation block>{String.raw`P\frac{(1+i)^n-1}{i}`}</Equation>
          <p className="method-value">{formatMoney(naive)}</p>
          <code>{naive.toPrecision(17)}</code>
          <p className="muted small">
            Cerca de cero, la resta puede perder cifras significativas.
          </p>
        </article>
        <article className="content-card accent-card">
          <p className="eyebrow">03 · EVALUACIÓN ESTABLE</p>
          <h2>Evitar la cancelación</h2>
          <Equation
            block
          >{String.raw`P\frac{\operatorname{expm1}(n\operatorname{log1p}(i))}{i}`}</Equation>
          <p className="method-value">{formatMoney(direct)}</p>
          <code>{direct.toPrecision(17)}</code>
          <p className="muted small">
            log1p y expm1 reducen la pérdida de precisión cerca de cero.
          </p>
        </article>
      </div>
      <div className="content-grid lab-explanation">
        <article className="content-card">
          <h2>¿Cuánto difieren?</h2>
          <dl className="metric-list">
            <div>
              <dt>Usual vs. estable</dt>
              <dd>{formatScientific(Math.abs(naive - direct))} ARS</dd>
            </div>
            <div>
              <dt>Iteración vs. fórmula estable</dt>
              <dd>{formatScientific(comparison.absoluteDifference)} ARS</dd>
            </div>
            <div>
              <dt>Tolerancia de comparación</dt>
              <dd>{formatScientific(comparison.tolerance)} ARS</dd>
            </div>
          </dl>
          <p className="small muted">
            La evaluación estable es una referencia de comparación, no el valor
            exacto certificado.
          </p>
        </article>
        <article className="content-card">
          <h2>Qué nos enseña</h2>
          <p>
            La Transformada Z obtiene una solución analítica de la ecuación en
            diferencias. Su evaluación en una computadora sigue sujeta al
            redondeo: la equivalencia algebraica no garantiza resultados
            numéricos idénticos.
          </p>
          <p>
            Para <Equation>{String.raw`i=0`}</Equation> se evalúa directamente{" "}
            <Equation>{String.raw`y(n)=Pn`}</Equation>. En los demás casos, la
            aplicación usa la fórmula estable y la contrasta con la iteración de
            la ecuación en diferencias.
          </p>
          <p>
            Este experimento de precisión complementa la resolución con las
            propiedades y tablas del apunte: estudia cómo se evalúa esa misma
            solución en una computadora.
          </p>
          <p className="muted small">
            La comparación verifica consistencia numérica. No demuestra
            rentabilidad futura ni valida las condiciones de un banco.
          </p>
        </article>
      </div>
    </>
  );
}
