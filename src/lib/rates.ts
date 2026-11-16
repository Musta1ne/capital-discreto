export type BankRate = {
  id: string;
  name: string;
  clientRate: number | null;
  nonClientRate: number | null;
  link: string | null;
  conditions: string | null;
};

export type RateSnapshot = {
  banks: BankRate[];
  /** Time of this consultation, not the publication date of the source rates. */
  consultedAt: string;
};

export const RATES_URL =
  "https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo";
export const RATE_SOURCE_URL =
  "https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo";

const CACHE_KEY = "v1:capital-discreto:bank-rates";
export const RATE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_ALLOWANCE_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bankId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeLink(value: unknown): string | null {
  const text = optionalText(value);
  if (text === null) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? text : null;
  } catch {
    return null;
  }
}

function sourceRate(value: unknown): number | null {
  // The source uses a ratio (0.30); the application uses a percentage (30).
  // A zero denotes an unavailable published offer, never a genuine zero TNA.
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 10
    ? value * 100
    : null;
}

export function parseRates(payload: unknown): BankRate[] {
  if (!Array.isArray(payload)) {
    throw new Error("La fuente de tasas devolvió un formato no válido.");
  }

  const banks: BankRate[] = [];
  const seen = new Set<string>();
  for (const row of payload) {
    if (!isRecord(row)) continue;
    const name = optionalText(row.entidad);
    if (name === null) continue;
    const id = bankId(name);
    if (!id || seen.has(id)) continue;

    // Root offers refer to 30-day placements. Never substitute rates from
    // row.tasas, whose entries can represent different placement lengths.
    const clientRate = sourceRate(row.tnaClientes);
    const nonClientRate = sourceRate(row.tnaNoClientes);
    if (clientRate === null && nonClientRate === null) continue;

    seen.add(id);
    banks.push({
      id,
      name,
      clientRate,
      nonClientRate,
      link: safeLink(row.enlace),
      conditions:
        optionalText(row.condiciones) ?? optionalText(row.condicionesCorto),
    });
  }

  if (banks.length === 0) {
    throw new Error(
      "La fuente no devolvió ofertas de plazo fijo válidas a 30 días.",
    );
  }
  return banks;
}

export async function fetchRates(signal?: AbortSignal): Promise<RateSnapshot> {
  let response: Response;
  try {
    response = await fetch(RATES_URL, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw error;
    }
    throw new Error("No se pudo conectar con la fuente de tasas.");
  }

  if (!response.ok) {
    throw new Error(
      `No se pudieron consultar las tasas (HTTP ${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw error;
    }
    throw new Error(
      "La fuente de tasas devolvió una respuesta JSON no válida.",
    );
  }

  const banks = parseRates(payload);
  return { banks, consultedAt: new Date().toISOString() };
}

function isCachedRate(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 1000)
  );
}

function parseCachedSnapshot(value: unknown): RateSnapshot | null {
  if (!isRecord(value) || typeof value.consultedAt !== "string") return null;
  const consultedTime = Date.parse(value.consultedAt);
  if (!Number.isFinite(consultedTime)) return null;
  if (new Date(consultedTime).toISOString() !== value.consultedAt) return null;
  const age = Date.now() - consultedTime;
  if (age > RATE_CACHE_MAX_AGE_MS || age < -CLOCK_ALLOWANCE_MS) return null;
  if (!Array.isArray(value.banks) || value.banks.length === 0) return null;

  const banks: BankRate[] = [];
  const seen = new Set<string>();
  for (const row of value.banks) {
    if (!isRecord(row)) return null;
    const name = optionalText(row.name);
    if (!name || row.id !== bankId(name) || !row.id || seen.has(row.id))
      return null;
    if (!isCachedRate(row.clientRate) || !isCachedRate(row.nonClientRate))
      return null;
    if (row.clientRate === null && row.nonClientRate === null) return null;
    if (row.link !== null && safeLink(row.link) === null) return null;
    if (row.conditions !== null && optionalText(row.conditions) === null)
      return null;

    seen.add(row.id);
    banks.push({
      id: row.id,
      name,
      clientRate: row.clientRate,
      nonClientRate: row.nonClientRate,
      link: safeLink(row.link),
      conditions: optionalText(row.conditions),
    });
  }
  return { banks, consultedAt: value.consultedAt };
}

export function readRateCache(
  storage: Pick<Storage, "getItem">,
): RateSnapshot | null {
  try {
    const serialized = storage.getItem(CACHE_KEY);
    if (serialized === null) return null;
    return parseCachedSnapshot(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function writeRateCache(
  storage: Pick<Storage, "setItem">,
  snapshot: RateSnapshot,
): void {
  try {
    const validSnapshot = parseCachedSnapshot(snapshot);
    if (validSnapshot !== null) {
      storage.setItem(CACHE_KEY, JSON.stringify(validSnapshot));
    }
  } catch {
    // Private mode, quota limits and unavailable storage do not stop the simulator.
  }
}
