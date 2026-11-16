import { useMemo, useState } from "react";
import { BankRates, bankAnnualRate, RateSource } from "./components/BankRates";
import type { ClientType } from "./components/BankRates";
import { SimulationPanel } from "./components/SimulationPanel";
import type { RateMode } from "./components/SimulationPanel";
import { SavingsChart } from "./components/SavingsChart";
import { ModelGuide } from "./components/ModelGuide";
import { PrecisionLab } from "./components/PrecisionLab";
import { Icon } from "./components/Icon";
import { Math as Equation } from "./components/Math";
import { useBankRates } from "./hooks/useBankRates";
import { compareBalances, DEFAULT_INPUT, simulateSavings } from "./lib/savings";
import { formatMoney, formatNumber, formatScientific } from "./lib/format";
import { InflationControls } from "./components/InflationControls";
import type { InflationMode } from "./components/InflationControls";
import { InflationResults } from "./components/InflationResults";
import { useInflation } from "./hooks/useInflation";
import {
  adjustSavingsForInflation,
  monthlyToPeriodInflation,
} from "./lib/inflation";

const views = [
  { id: "simulator", label: "Simulador" },
  { id: "rates", label: "Tasas bancarias" },
  { id: "model", label: "Modelo matemático" },
  { id: "precision", label: "Precisión numérica" },
] as const;
type View = (typeof views)[number]["id"];

export default function App() {
  const [view, setView] = useState<View>("simulator");
  const [contribution, setContribution] = useState(DEFAULT_INPUT.contribution);
  const [periods, setPeriods] = useState(DEFAULT_INPUT.periods);
  const [customRate, setCustomRate] = useState(DEFAULT_INPUT.annualRate);
  const [rateMode, setRateMode] = useState<RateMode>("bank");
  const [clientType, setClientType] = useState<ClientType>("client");
  const [bankId, setBankId] = useState("");
  const [inflationEnabled, setInflationEnabled] = useState(false);
  const [inflationMode, setInflationMode] =
    useState<InflationMode>("published");
  const [manualInflation, setManualInflation] = useState(0);
  const [projectionDate] = useState(() => new Date());
  const baseDate = projectionDate.toLocaleDateString("es-AR");
  const inflation = useInflation(
    inflationEnabled && inflationMode === "published",
  );
  const monthlyInflation =
    inflationMode === "manual"
      ? manualInflation
      : inflation.snapshot?.monthlyPercent;
  const rates = useBankRates();
  const banks = rates.snapshot?.banks ?? [];
  const selectedBank =
    banks.find((bank) => bank.id === bankId) ??
    banks.find((bank) => bankAnnualRate(bank, clientType) !== null) ??
    banks[0];
  const selectedRate = selectedBank
    ? bankAnnualRate(selectedBank, clientType)
    : null;
  const annualRate = rateMode === "manual" ? customRate : (selectedRate ?? NaN);
  const input = useMemo(
    () => ({ contribution, annualRate, periods }),
    [contribution, annualRate, periods],
  );
  const error =
    !Number.isFinite(contribution) || contribution < 0 || contribution > 1e9
      ? "Ingresá un aporte entre $0 y $1.000.000.000."
      : !Number.isInteger(periods) || periods < 1 || periods > 60
        ? "La cantidad de períodos debe ser un entero entre 1 y 60."
        : !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 1000
          ? rateMode === "bank"
            ? "Elegí una tasa bancaria disponible o ingresá una tasa manual."
            : "Ingresá una TNA entre 0 % y 1.000 %."
          : null;
  const results = useMemo(
    () => (error ? [] : simulateSavings(input)),
    [input, error],
  );
  const final = results.at(-1);
  const comparison = final
    ? compareBalances(final.balance, final.directBalance)
    : null;
  const inflationCalculation = useMemo(() => {
    if (!inflationEnabled || results.length === 0)
      return { rows: null, error: null };
    if (monthlyInflation === undefined)
      return {
        rows: null,
        error:
          "Falta un dato de inflación. La proyección nominal sigue disponible.",
      };
    if (
      !Number.isFinite(monthlyInflation) ||
      monthlyInflation < -99 ||
      monthlyInflation > 1000
    )
      return {
        rows: null,
        error:
          "Ingresá una inflación mensual entre −99 % y 1.000 % para calcular el poder adquisitivo.",
      };
    try {
      return {
        rows: adjustSavingsForInflation(
          results,
          monthlyToPeriodInflation(monthlyInflation),
        ),
        error: null,
      };
    } catch {
      return {
        rows: null,
        error:
          "No se pudo calcular el ajuste por inflación con estos parámetros. La proyección nominal sigue disponible.",
      };
    }
  }, [inflationEnabled, results, monthlyInflation]);
  const inflationRows = inflationCalculation.rows;
  const realFinal = inflationRows?.at(-1);

  const changeView = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const changeClientType = (next: ClientType) => {
    setClientType(next);
    if (!selectedBank || bankAnnualRate(selectedBank, next) === null) {
      setBankId(
        banks.find((bank) => bankAnnualRate(bank, next) !== null)?.id ?? "",
      );
    }
  };
  const changeMode = (next: RateMode) => {
    if (next === "manual" && selectedRate !== null) setCustomRate(selectedRate);
    setRateMode(next);
  };
  const reset = () => {
    setContribution(DEFAULT_INPUT.contribution);
    setPeriods(DEFAULT_INPUT.periods);
    setCustomRate(DEFAULT_INPUT.annualRate);
    setRateMode("bank");
    setClientType("client");
    setBankId("");
    setInflationEnabled(false);
    setInflationMode("published");
    setManualInflation(0);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="brand"
            onClick={() => changeView("simulator")}
            aria-label="Capital discreto, ir al simulador"
          >
            <span className="brand-symbol">
              <Icon name="trend" size={23} />
            </span>
            <span>
              capital<span className="brand-light">discreto</span>
              <span className="brand-caption">AHORRO & MATEMÁTICA</span>
            </span>
          </button>
          <nav className="main-nav" aria-label="Secciones de la herramienta">
            {views.map((item) => (
              <button
                className={view === item.id ? "active" : ""}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => changeView(item.id)}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <span className="header-tag">
            <span className="status-dot" /> Modelo discreto
          </span>
        </div>
      </header>

      <main id="main" className="main-container">
        {view === "simulator" && (
          <>
            <section className="dashboard-heading">
              <div>
                <p className="eyebrow">
                  <span className="tiny-line" /> PESOS ARGENTINOS · INTERÉS
                  COMPUESTO
                </p>
                <h1>
                  Tu ahorro, <em>período a período.</em>
                </h1>
                <p>
                  Proyectá con una tasa bancaria. Entendé la matemática detrás
                  de cada resultado.
                </p>
              </div>
              <div className="heading-equation">
                <Equation>{String.raw`y(n)=(1+i)y(n-1)+P`}</Equation>
                <span>Una regla simple. Un crecimiento acumulativo.</span>
              </div>
            </section>

            {rates.error && (
              <div className="notice warning-notice" role="status">
                {rates.error}{" "}
                {rates.snapshot
                  ? "Se mantiene la última consulta disponible, identificada como copia local."
                  : "Podés continuar con una tasa manual."}
              </div>
            )}
            {rates.stale && (
              <div className="notice warning-notice" role="status">
                La última consulta tiene más de 3 horas. Estos datos pueden
                haber cambiado; se está intentando renovarlos cuando hay
                conexión.
              </div>
            )}

            <div className="dashboard-grid">
              <SimulationPanel
                input={input}
                rateMode={rateMode}
                customRate={customRate}
                banks={banks}
                bankId={selectedBank?.id ?? ""}
                clientType={clientType}
                onContribution={setContribution}
                onPeriods={setPeriods}
                onCustomRate={setCustomRate}
                onMode={changeMode}
                onBank={setBankId}
                onClientType={changeClientType}
                onReset={reset}
              >
                <InflationControls
                  enabled={inflationEnabled}
                  mode={inflationMode}
                  manualPercent={manualInflation}
                  snapshot={inflation.snapshot}
                  loading={inflation.loading}
                  error={inflation.error}
                  fromCache={inflation.fromCache}
                  stale={inflation.stale}
                  canRefresh={inflation.canRefresh}
                  onEnabled={setInflationEnabled}
                  onMode={setInflationMode}
                  onManualPercent={setManualInflation}
                  onRefresh={() => void inflation.refresh()}
                />
              </SimulationPanel>
              <section
                className="results-column"
                aria-label="Resultados de la proyección"
              >
                {final && comparison ? (
                  <>
                    <div className="summary-panel panel">
                      <div className="summary-top">
                        <div>
                          <p className="eyebrow">SALDO FINAL PROYECTADO</p>
                          <p
                            className="final-balance"
                            data-testid="final-balance"
                          >
                            {formatMoney(final.balance)}
                          </p>
                        </div>
                        <span className="horizon-badge">
                          {periods} × 30 días
                          <Icon name="trend" size={17} />
                        </span>
                      </div>
                      <div className="summary-bottom">
                        <div>
                          <span className="metric-label">
                            <span className="legend-dot muted-dot" /> Total
                            aportado
                          </span>
                          <strong>{formatMoney(final.contributed)}</strong>
                        </div>
                        <div>
                          <span className="metric-label">
                            <span className="legend-dot" /> Intereses acumulados
                          </span>
                          <strong className="accent-text">
                            + {formatMoney(final.interest)}
                          </strong>
                        </div>
                        <div className="rate-summary">
                          <span className="metric-label">TNA utilizada</span>
                          <strong>
                            {formatNumber(annualRate, 4)} <span>%</span>
                          </strong>
                        </div>
                      </div>
                    </div>
                    {realFinal && monthlyInflation !== undefined && (
                      <InflationResults
                        result={realFinal}
                        baseDate={baseDate}
                        monthlyPercent={monthlyInflation}
                      />
                    )}
                    {inflationCalculation.error && (
                      <p className="notice warning-notice" role="status">
                        {inflationCalculation.error}
                      </p>
                    )}
                    <div className="chart-panel panel">
                      <div className="chart-heading">
                        <div>
                          <h2>El recorrido de tu ahorro</h2>
                          <p>
                            {periods * 30} días · sin retiros · tasa constante
                          </p>
                        </div>
                        <div
                          className={`chart-legend ${inflationRows ? "with-inflation" : ""}`}
                        >
                          <span>
                            <i className="legend-line" />{" "}
                            {inflationRows ? "Saldo nominal" : "Con intereses"}
                          </span>
                          <span>
                            <i className="legend-line baseline" />{" "}
                            {inflationRows
                              ? "Aportes nominales"
                              : "Solo aportes"}
                          </span>
                          {inflationRows && (
                            <span>
                              <i className="legend-line real" /> Saldo real ·
                              pesos iniciales
                            </span>
                          )}
                        </div>
                      </div>
                      <SavingsChart
                        data={inflationRows ?? results}
                        showReal={!!inflationRows}
                        baseDate={baseDate}
                      />
                      <div className="chart-footnote">
                        <Icon name="book" size={15} />
                        <span>
                          El primer aporte se realiza al día 30:{" "}
                          <strong>
                            en el período 1 todavía no genera intereses.
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="validation-strip">
                      <span
                        className={`validation-icon ${comparison.agrees ? "" : "invalid"}`}
                      >
                        <Icon
                          name={comparison.agrees ? "check" : "close"}
                          size={15}
                        />
                      </span>
                      <div>
                        <strong>
                          {comparison.agrees
                            ? "Dos cálculos, resultados consistentes"
                            : "Los cálculos superan la tolerancia"}
                        </strong>
                        <span>
                          Iteración y fórmula estable · diferencia:{" "}
                          {formatScientific(comparison.absoluteDifference)} ARS
                        </span>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => changeView("precision")}
                      >
                        Explorar precisión <Icon name="arrow-right" size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-results panel">
                    <span className="empty-mark">
                      <Icon name="trend" size={36} />
                    </span>
                    <h2>
                      {rates.loading && rateMode === "bank"
                        ? "Consultando tasas bancarias…"
                        : "Prepará tu proyección"}
                    </h2>
                    <p role="status">{error}</p>
                    {rateMode === "bank" && (
                      <button
                        className="button button-primary"
                        onClick={() => changeMode("manual")}
                      >
                        Usar una tasa manual
                        <Icon name="arrow-right" size={17} />
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="data-source-bar">
              <RateSource
                snapshot={rates.snapshot}
                fromCache={rates.fromCache || !!rates.error}
                stale={rates.stale}
              />
              <button
                className="button button-subtle refresh-button"
                disabled={!rates.canRefresh}
                onClick={() => void rates.refresh()}
                title="Se consulta como máximo cada 3 horas; ante un error se puede reintentar después de un minuto."
              >
                <Icon name="reset" size={15} />
                {rates.loading
                  ? "Consultando…"
                  : rates.canRefresh
                    ? "Consultar tasas"
                    : "Consulta cada 3 h"}
              </button>
            </div>
            {rateMode === "bank" && selectedBank?.conditions && (
              <details className="conditions-panel">
                <summary>
                  Condiciones informadas por {selectedBank.name}
                </summary>
                <p>{selectedBank.conditions}</p>
              </details>
            )}

            {final && comparison && (
              <section className="periods-section panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      EL DETALLE, SIN REDONDEOS INTERMEDIOS
                    </p>
                    <h2>Cada período cuenta</h2>
                  </div>
                  <span className="quiet-badge">
                    {periods + 1} filas · incluye saldo inicial
                  </span>
                </div>
                <details className="results-table-details">
                  <summary>
                    Ver tabla por período <Icon name="chevron" size={16} />
                  </summary>
                  <div className="table-scroll">
                    <table>
                      <caption>
                        Importes en pesos argentinos. Se redondea solamente la
                        visualización a centavos.
                        {inflationRows &&
                          ` Saldo y aportes reales se expresan en pesos del ${baseDate}. El resultado en poder adquisitivo es su diferencia; no representa un débito ni una pérdida bancaria nominal. Las demás columnas son nominales.`}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Período</th>
                          <th scope="col">Días</th>
                          <th scope="col">Aportes acumulados</th>
                          <th scope="col">Intereses acumulados</th>
                          <th scope="col">Saldo iterativo</th>
                          <th scope="col">Saldo fórmula estable</th>
                          {inflationRows && (
                            <>
                              <th scope="col">Saldo real</th>
                              <th scope="col">Aportes reales</th>
                              <th scope="col">
                                Resultado en poder adquisitivo
                              </th>
                              <th scope="col">
                                Inflación acumulada proyectada
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row) => (
                          <tr key={row.period}>
                            <th scope="row">
                              {row.period === 0 ? "0 · inicial" : row.period}
                            </th>
                            <td>{row.period * 30}</td>
                            <td>{formatMoney(row.contributed)}</td>
                            <td>{formatMoney(row.interest)}</td>
                            <td className="accent-text">
                              {formatMoney(row.balance)}
                            </td>
                            <td>{formatMoney(row.directBalance)}</td>
                            {inflationRows && (
                              <>
                                <td className="real-text">
                                  {formatMoney(
                                    inflationRows[row.period].realBalance,
                                  )}
                                </td>
                                <td>
                                  {formatMoney(
                                    inflationRows[row.period].realContributed,
                                  )}
                                </td>
                                <td>
                                  {formatMoney(
                                    inflationRows[row.period].realGain,
                                  )}
                                </td>
                                <td>
                                  {formatNumber(
                                    inflationRows[row.period]
                                      .accumulatedInflation * 100,
                                    4,
                                  )}{" "}
                                  %
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <div className="comparison-detail">
                  <span>
                    Saldo por fórmula estable:{" "}
                    <strong>{formatMoney(final.directBalance)}</strong>
                  </span>
                  <span>
                    Tolerancia: {formatScientific(comparison.tolerance)} ARS ·
                    diferencia relativa:{" "}
                    {formatScientific(comparison.relativeDifference)}
                  </span>
                </div>
              </section>
            )}
            <div className="bottom-explainer">
              <span className="eyebrow">MÁS ALLÁ DEL RESULTADO</span>
              <h2>El cálculo también se puede entender.</h2>
              <p>
                La Transformada Z permite resolver el modelo de ahorro. Explorá
                la derivación y por qué la forma de evaluar una fórmula cambia
                su precisión.
              </p>
              <button
                className="button button-secondary"
                onClick={() => changeView("model")}
              >
                Conocer el modelo
                <Icon name="arrow-right" size={17} />
              </button>
            </div>
          </>
        )}

        {view === "rates" && (
          <>
            <BankRates
              banks={banks}
              selectedId={rateMode === "bank" ? (selectedBank?.id ?? "") : ""}
              clientType={clientType}
              onClientType={changeClientType}
              onSelect={(id) => {
                setBankId(id);
                setRateMode("bank");
                changeView("simulator");
              }}
            />
            <div className="data-source-bar">
              <RateSource
                snapshot={rates.snapshot}
                fromCache={rates.fromCache || !!rates.error}
                stale={rates.stale}
              />
              <button
                className="button button-subtle"
                disabled={!rates.canRefresh}
                onClick={() => void rates.refresh()}
              >
                <Icon name="reset" size={15} />
                {rates.loading
                  ? "Consultando…"
                  : rates.canRefresh
                    ? "Consultar tasas"
                    : "Consulta cada 3 h"}
              </button>
            </div>
            {rates.error && (
              <p className="notice warning-notice" role="status">
                {rates.error}
              </p>
            )}
          </>
        )}
        {view === "model" && <ModelGuide />}
        {view === "precision" && <PrecisionLab />}
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          capitaldiscreto<span>Una herramienta para explorar el ahorro.</span>
        </span>
        <p>
          Proyección educativa en pesos nominales, con ajuste opcional por
          inflación. No incluye impuestos ni comisiones.
          <br />
          La tasa de hoy no garantiza la tasa de futuras renovaciones.
        </p>
        <div className="footer-meta">
          ANÁLISIS NUMÉRICO
          <br />
          <span>Ingeniería en Sistemas · UTN</span>
          <p className="footer-members">
            <span>Integrantes</span>
            Agustin Macello
            <br />
            Francisco Monzoni
          </p>
          <a
            className="button button-subtle footer-repository"
            href="https://github.com/Musta1ne/capital-discreto"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver el repositorio de Capital Discreto en GitHub (se abre en una pestaña nueva)"
          >
            Ver repositorio en GitHub <Icon name="arrow-right" size={15} />
          </a>
        </div>
      </footer>
    </div>
  );
}
