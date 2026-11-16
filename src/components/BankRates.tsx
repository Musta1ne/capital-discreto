import { useMemo, useState } from "react";
import type { BankRate, RateSnapshot } from "../lib/rates";
import { RATE_SOURCE_URL } from "../lib/rates";
import { formatNumber } from "../lib/format";
import { Icon } from "./Icon";

export type ClientType = "client" | "non-client";
export const bankAnnualRate = (bank: BankRate, clientType: ClientType) =>
  clientType === "client" ? bank.clientRate : bank.nonClientRate;

export function RateSource({
  snapshot,
  fromCache,
  stale,
}: {
  snapshot: RateSnapshot | null;
  fromCache: boolean;
  stale: boolean;
}) {
  return (
    <div className="source-note">
      <p>
        <span className={`status-dot ${stale ? "warning" : ""}`} />{" "}
        {snapshot
          ? `Consultado el ${new Date(snapshot.consultedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`
          : "Todavía no hay una consulta disponible"}
        {fromCache && snapshot ? " · copia local" : ""}
      </p>
      <p>
        <a href={RATE_SOURCE_URL} target="_blank" rel="noreferrer">
          ArgentinaDatos
        </a>{" "}
        · servicio independiente. Referencia:{" "}
        <a
          href="https://www.bcra.gob.ar/plazos-fijos-online/"
          target="_blank"
          rel="noreferrer"
        >
          comparador del BCRA
        </a>
        .
      </p>
      <p>
        La fuente no informa fecha de vigencia. Tasas de referencia para
        $100.000 a 30 días; confirmá condiciones y monto con la entidad.
      </p>
    </div>
  );
}

export function BankRates({
  banks,
  selectedId,
  clientType,
  onSelect,
  onClientType,
}: {
  banks: BankRate[];
  selectedId: string;
  clientType: ClientType;
  onSelect: (id: string) => void;
  onClientType: (type: ClientType) => void;
}) {
  const [search, setSearch] = useState("");
  const sorted = useMemo(
    () =>
      banks
        .filter((bank) =>
          bank.name
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es")),
        )
        .sort(
          (a, b) =>
            (bankAnnualRate(b, clientType) ?? -1) -
            (bankAnnualRate(a, clientType) ?? -1),
        ),
    [banks, clientType, search],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATOS PARA DECIDIR EL SUPUESTO</p>
          <h1>Tasas bancarias</h1>
          <p>
            Elegí una referencia para tu proyección. La tasa puede cambiar en
            futuras renovaciones.
          </p>
        </div>
        <span className="quiet-badge">
          {banks.length} entidades consultadas
        </span>
      </div>
      <div className="rates-toolbar">
        <div className="segmented" aria-label="Condición del cliente">
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
        <input
          className="search-input"
          type="search"
          aria-label="Buscar banco"
          placeholder="Buscar una entidad…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="bank-grid">
        {sorted.map((bank) => {
          const rate = bankAnnualRate(bank, clientType);
          const selected = selectedId === bank.id;
          return (
            <article
              className={`bank-card ${selected ? "selected" : ""}`}
              key={bank.id}
            >
              <div className="bank-card-heading">
                <span className="bank-monogram" aria-hidden="true">
                  {bank.name.replace(/^BANCO\s+/i, "").slice(0, 2)}
                </span>
                {selected && (
                  <span className="selected-label">
                    <Icon name="check" size={14} /> Seleccionada
                  </span>
                )}
              </div>
              <h2>{bank.name}</h2>
              <div className="bank-rate">
                {rate === null ? "—" : `${formatNumber(rate)} %`}
                <span>TNA · 30 días</span>
              </div>
              <p className="muted small">
                {rate === null
                  ? "Sin tasa publicada para esta condición."
                  : "Referencia del proveedor. Sujeta a condiciones de la entidad."}
              </p>
              {bank.conditions && (
                <details className="bank-conditions">
                  <summary>Condiciones informadas</summary>
                  <p>{bank.conditions}</p>
                </details>
              )}
              <button
                className={
                  selected ? "button button-subtle" : "button button-secondary"
                }
                disabled={rate === null}
                onClick={() => onSelect(bank.id)}
              >
                {selected ? "Usar esta tasa" : "Simular con esta tasa"}
                <Icon name="arrow-right" size={16} />
              </button>
            </article>
          );
        })}
      </div>
      {sorted.length === 0 && (
        <div className="empty-state">
          {banks.length
            ? "No encontramos entidades con ese nombre."
            : "No hay tasas disponibles. Podés usar una tasa manual en el simulador."}
        </div>
      )}
    </>
  );
}
