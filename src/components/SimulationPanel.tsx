import type { BankRate } from "../lib/rates";
import { annualToPeriodRate, DEFAULT_INPUT } from "../lib/savings";
import type { SavingsInput } from "../lib/savings";
import { formatNumber } from "../lib/format";
import { Icon } from "./Icon";
import { bankAnnualRate } from "./BankRates";
import type { ClientType } from "./BankRates";
import type { ReactNode } from "react";

export type RateMode = "bank" | "manual";
type Props = {
  children?: ReactNode;
  input: SavingsInput;
  rateMode: RateMode;
  customRate: number;
  banks: BankRate[];
  bankId: string;
  clientType: ClientType;
  onContribution: (value: number) => void;
  onPeriods: (value: number) => void;
  onCustomRate: (value: number) => void;
  onMode: (mode: RateMode) => void;
  onBank: (id: string) => void;
  onClientType: (type: ClientType) => void;
  onReset: () => void;
};

const numberInput = (value: string) => (value === "" ? NaN : Number(value));
export function SimulationPanel({
  children,
  input,
  rateMode,
  customRate,
  banks,
  bankId,
  clientType,
  onContribution,
  onPeriods,
  onCustomRate,
  onMode,
  onBank,
  onClientType,
  onReset,
}: Props) {
  const validRate =
    Number.isFinite(input.annualRate) &&
    input.annualRate >= 0 &&
    input.annualRate <= 1000;
  return (
    <aside className="control-panel panel">
      <div className="panel-heading">
        <h2>Tu plan de ahorro</h2>
        <button
          className="icon-button"
          title="Restablecer parámetros"
          aria-label="Restablecer parámetros"
          onClick={onReset}
        >
          <Icon name="reset" size={17} />
        </button>
      </div>
      <div className="field-group">
        <label htmlFor="contribution">Aporte por período</label>
        <div className="input-with-unit">
          <span>$</span>
          <input
            id="contribution"
            type="number"
            min="0"
            max="1000000000"
            step="1000"
            value={Number.isNaN(input.contribution) ? "" : input.contribution}
            onChange={(event) =>
              onContribution(numberInput(event.target.value))
            }
          />
          <span>ARS</span>
        </div>
        <p className="field-hint">Se agrega al finalizar cada período.</p>
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor={rateMode === "bank" ? "bank-select" : "annual-rate"}>
            Tasa de interés
          </label>
          <button
            className="text-button"
            onClick={() => onMode(rateMode === "bank" ? "manual" : "bank")}
          >
            {rateMode === "bank" ? "Ingresar manual" : "Elegir banco"}
          </button>
        </div>
        {rateMode === "bank" ? (
          <>
            <div className="segmented small-segment">
              <button
                aria-pressed={clientType === "client"}
                onClick={() => onClientType("client")}
              >
                Soy cliente
              </button>
              <button
                aria-pressed={clientType === "non-client"}
                onClick={() => onClientType("non-client")}
              >
                No soy cliente
              </button>
            </div>
            <select
              id="bank-select"
              value={bankId}
              onChange={(event) => onBank(event.target.value)}
              aria-label="Banco de referencia"
            >
              {banks.length === 0 && (
                <option value="">Sin tasas disponibles</option>
              )}
              {banks.map((bank) => (
                <option
                  key={bank.id}
                  value={bank.id}
                  disabled={bankAnnualRate(bank, clientType) === null}
                >
                  {bank.name}
                  {bankAnnualRate(bank, clientType) === null
                    ? " · sin dato"
                    : ""}
                </option>
              ))}
            </select>
            <div className="rate-display">
              <strong>
                {validRate ? formatNumber(input.annualRate, 4) : "—"}
                <span> %</span>
              </strong>
              <span className="muted small">TNA de referencia</span>
            </div>
          </>
        ) : (
          <>
            <div className="input-with-unit">
              <input
                id="annual-rate"
                type="number"
                min="0"
                max="1000"
                step="any"
                value={Number.isNaN(customRate) ? "" : customRate}
                onChange={(event) =>
                  onCustomRate(numberInput(event.target.value))
                }
              />
              <span>% TNA</span>
            </div>
            <p className="field-hint manual-notice">
              Tasa manual: un supuesto propio, sin validación bancaria.
            </p>
          </>
        )}
        <p className="period-rate">
          Tasa por 30 días{" "}
          <strong>
            {validRate
              ? `${formatNumber(annualToPeriodRate(input.annualRate) * 100, 6)} %`
              : "—"}
          </strong>
        </p>
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor="periods">Horizonte de ahorro</label>
          <span className="small muted">1–60 períodos</span>
        </div>
        <div className="period-input">
          <input
            id="periods"
            type="number"
            min="1"
            max="60"
            step="1"
            value={Number.isNaN(input.periods) ? "" : input.periods}
            onChange={(event) => onPeriods(numberInput(event.target.value))}
          />
          <span>períodos de 30 días</span>
        </div>
        <input
          className="range-input"
          aria-label="Ajustar cantidad de períodos"
          type="range"
          min="1"
          max="60"
          step="1"
          value={
            Number.isFinite(input.periods)
              ? Math.max(1, Math.min(60, input.periods))
              : 1
          }
          onChange={(event) => onPeriods(Number(event.target.value))}
        />
        <div className="range-labels">
          <span>30 días</span>
          <span>1.800 días</span>
        </div>
      </div>
      {children}
      <div className="model-note">
        <span className="note-symbol" aria-hidden="true">
          i
        </span>
        <p>
          Saldo inicial cero. Reinversión total y aportes al cierre. La tasa se
          supone constante.
        </p>
      </div>
      <p className="small muted reset-hint">
        Valores iniciales: aporte ${formatNumber(DEFAULT_INPUT.contribution)},
        12 períodos.
      </p>
    </aside>
  );
}
