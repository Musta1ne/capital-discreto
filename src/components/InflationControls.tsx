import type { InflationSnapshot } from "../lib/inflationData";
import { INFLATION_SOURCE_URL } from "../lib/inflationData";
import { formatNumber } from "../lib/format";
import { monthlyToPeriodInflation } from "../lib/inflation";

export type InflationMode = "published" | "manual";

export function formatReferenceMonth(referenceDate: string) {
  // Parse in UTC so a month-end reference cannot move to the previous day locally.
  return new Date(`${referenceDate}T12:00:00Z`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Props = {
  enabled: boolean;
  mode: InflationMode;
  manualPercent: number;
  snapshot: InflationSnapshot | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  stale: boolean;
  canRefresh: boolean;
  onEnabled: (enabled: boolean) => void;
  onMode: (mode: InflationMode) => void;
  onManualPercent: (value: number) => void;
  onRefresh: () => void;
};

export function InflationControls({
  enabled,
  mode,
  manualPercent,
  snapshot,
  loading,
  error,
  fromCache,
  stale,
  canRefresh,
  onEnabled,
  onMode,
  onManualPercent,
  onRefresh,
}: Props) {
  const monthlyPercent =
    mode === "manual" ? manualPercent : snapshot?.monthlyPercent;
  const valid =
    monthlyPercent !== undefined &&
    Number.isFinite(monthlyPercent) &&
    monthlyPercent >= -99 &&
    monthlyPercent <= 1000;
  return (
    <div className="field-group inflation-controls">
      <label className="inflation-toggle" htmlFor="inflation-enabled">
        <span>
          Poder adquisitivo
          <span className="inflation-toggle-hint">
            Incluir análisis de inflación
          </span>
        </span>
        <input
          id="inflation-enabled"
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(event) => onEnabled(event.target.checked)}
        />
      </label>
      {enabled && (
        <div className="inflation-options">
          <fieldset className="inflation-mode">
            <legend>Supuesto de inflación mensual</legend>
            <label>
              <input
                type="radio"
                name="inflation-mode"
                checked={mode === "published"}
                onChange={() => onMode("published")}
              />
              Última inflación mensual publicada
            </label>
            <label>
              <input
                type="radio"
                name="inflation-mode"
                checked={mode === "manual"}
                onChange={() => onMode("manual")}
              />
              Estimación manual
            </label>
          </fieldset>
          {mode === "manual" ? (
            <>
              <label htmlFor="monthly-inflation">
                Inflación mensual estimada
              </label>
              <div className="input-with-unit">
                <input
                  id="monthly-inflation"
                  type="number"
                  step="any"
                  min="-99"
                  max="1000"
                  value={Number.isNaN(manualPercent) ? "" : manualPercent}
                  onChange={(event) =>
                    onManualPercent(
                      event.target.value === ""
                        ? NaN
                        : Number(event.target.value),
                    )
                  }
                  aria-invalid={!valid}
                />
                <span>% mensual</span>
              </div>
              <p className="field-hint">
                Estimación propia constante. Se admite deflación, de −99 % a
                1.000 % mensual.
              </p>
              {!valid && (
                <p className="inflation-error" role="status">
                  Ingresá una variación mensual finita entre −99 % y 1.000 %.
                </p>
              )}
            </>
          ) : (
            <>
              {snapshot ? (
                <div className="published-inflation">
                  <strong>{formatNumber(snapshot.monthlyPercent, 4)} %</strong>
                  <span>
                    Variación mensual del IPC
                    <br />
                    <b>{formatReferenceMonth(snapshot.referenceDate)}</b>
                  </span>
                </div>
              ) : (
                <p className="field-hint" role="status">
                  {loading
                    ? "Consultando el último IPC mensual publicado…"
                    : "No hay un dato de IPC disponible. Podés usar una estimación manual."}
                </p>
              )}
              {error && (
                <p className="inflation-error" role="status">
                  {error}
                  {snapshot
                    ? " Se conserva la copia local con el período indicado."
                    : ""}
                </p>
              )}
              {stale && (
                <p className="inflation-error" role="status">
                  La consulta tiene más de 3 horas. Se muestra una copia; puede
                  haber una publicación posterior.
                </p>
              )}
              <div className="inflation-source">
                <p>
                  Fuente:{" "}
                  <a
                    href={INFLATION_SOURCE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ArgentinaDatos
                  </a>{" "}
                  ·{" "}
                  <a
                    href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31"
                    target="_blank"
                    rel="noreferrer"
                  >
                    INDEC
                  </a>
                  .
                </p>
                {snapshot && (
                  <>
                    <p>
                      Consultado:{" "}
                      {new Date(snapshot.consultedAt).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {fromCache || error ? " · copia local" : ""}.
                    </p>
                    <p>
                      {snapshot.sourceUpdatedAt
                        ? `Modificación del recurso: ${new Date(snapshot.sourceUpdatedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`
                        : "Actualización de la fuente: fecha no informada por la API."}
                    </p>
                    <p>
                      La fecha del dato identifica el mes de referencia; no su
                      fecha de publicación.
                    </p>
                  </>
                )}
              </div>
              <button
                className="text-button inflation-refresh"
                disabled={!canRefresh}
                onClick={onRefresh}
              >
                {loading
                  ? "Consultando inflación…"
                  : canRefresh
                    ? "Consultar inflación"
                    : error
                      ? "Reintento disponible en un minuto"
                      : "Consulta como máximo cada 3 h"}
              </button>
            </>
          )}
          {valid && (
            <p className="period-rate">
              Supuesto equivalente a 30 días
              <strong>
                {formatNumber(
                  monthlyToPeriodInflation(monthlyPercent!) * 100,
                  6,
                )}{" "}
                %
              </strong>
            </p>
          )}
          <p className="field-hint inflation-assumption">
            {mode === "published"
              ? "El IPC es histórico. Se reutiliza como supuesto constante, no como inflación futura conocida."
              : "La estimación se repite durante toda la proyección; no es inflación observada."}{" "}
            Conversión aproximada con meses medios de 365/12 días.
          </p>
        </div>
      )}
    </div>
  );
}
