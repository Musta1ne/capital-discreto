export type InflationSnapshot = {
  /** Provider date identifies the reference month, not the publication day. */
  referenceDate: string;
  /** Monthly percentage points: 2.2 means 2.2%, not a ratio or annual rate. */
  monthlyPercent: number;
  /** Time of this consultation. It does not date the underlying IPC release. */
  consultedAt: string;
  /** Optional HTTP resource metadata, never interpreted as an INDEC release date. */
  sourceUpdatedAt: string | null;
};

export const INFLATION_URL =
  "https://api.argentinadatos.com/v1/finanzas/indices/inflacion";
export const INFLATION_SOURCE_URL =
  "https://argentinadatos.com/docs/operations/get-finanzas-indices-inflacion";
export const INFLATION_CACHE_KEY = "v1:capital-discreto:monthly-inflation";
export const INFLATION_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const INFLATION_REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

const CLOCK_ALLOWANCE_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMonthlyPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -99 &&
    value <= 1000
  );
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value
    ? time
    : null;
}

/**
 * Strict monthly-series parsing: fail rather than quietly show an older month
 * when a newer row is malformed. Calendar comparisons use UTC month keys.
 */
export function parseLatestInflation(
  payload: unknown,
  now: Date = new Date(),
): { referenceDate: string; monthlyPercent: number } {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("La fecha de consulta de inflación no es válida.");
  }
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("La fuente de inflación devolvió un formato no válido.");
  }

  const currentMonth = now.toISOString().slice(0, 7);
  const valuesByDate = new Map<string, number>();
  let latest: { referenceDate: string; monthlyPercent: number } | null = null;

  for (const row of payload) {
    if (!isRecord(row) || !isCalendarDate(row.fecha)) {
      throw new Error("La fuente de inflación contiene una fecha no válida.");
    }
    if (row.fecha.slice(0, 7) >= currentMonth) {
      throw new Error(
        "La fuente de inflación contiene un mes actual o futuro sin publicación mensual completa.",
      );
    }
    if (!isMonthlyPercent(row.valor)) {
      throw new Error(
        "La fuente de inflación contiene una variación mensual no válida.",
      );
    }
    const priorValue = valuesByDate.get(row.fecha);
    if (priorValue !== undefined && priorValue !== row.valor) {
      throw new Error(
        "La fuente de inflación contiene valores contradictorios para una misma fecha.",
      );
    }
    valuesByDate.set(row.fecha, row.valor);
    if (latest === null || row.fecha > latest.referenceDate) {
      latest = { referenceDate: row.fecha, monthlyPercent: row.valor };
    }
  }

  // A non-empty, fully validated array always selects at least one row.
  if (latest === null) {
    throw new Error("La fuente no devolvió datos mensuales de inflación.");
  }
  return latest;
}

function isAborted(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function fetchInflation(
  signal?: AbortSignal,
): Promise<InflationSnapshot> {
  let response: Response;
  try {
    response = await fetch(INFLATION_URL, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (isAborted(error, signal)) throw error;
    throw new Error("No se pudo conectar con la fuente de inflación.");
  }
  if (!response.ok) {
    throw new Error(
      `No se pudo consultar la inflación (HTTP ${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (isAborted(error, signal)) throw error;
    throw new Error(
      "La fuente de inflación devolvió una respuesta JSON no válida.",
    );
  }

  const now = new Date();
  const latest = parseLatestInflation(payload, now);
  const header = response.headers.get("Last-Modified");
  const modifiedTime = header === null ? Number.NaN : Date.parse(header);
  const sourceUpdatedAt =
    Number.isFinite(modifiedTime) &&
    modifiedTime <= now.getTime() + CLOCK_ALLOWANCE_MS
      ? new Date(modifiedTime).toISOString()
      : null;

  return { ...latest, consultedAt: now.toISOString(), sourceUpdatedAt };
}

function parseCachedSnapshot(value: unknown): InflationSnapshot | null {
  if (!isRecord(value)) return null;
  const consultedTime = timestamp(value.consultedAt);
  if (consultedTime === null) return null;
  const age = Date.now() - consultedTime;
  if (age > INFLATION_CACHE_MAX_AGE_MS || age < -CLOCK_ALLOWANCE_MS)
    return null;

  let sourceUpdatedAt: string | null = null;
  if (value.sourceUpdatedAt !== null) {
    const modifiedTime = timestamp(value.sourceUpdatedAt);
    if (
      modifiedTime === null ||
      modifiedTime > consultedTime + CLOCK_ALLOWANCE_MS
    ) {
      return null;
    }
    sourceUpdatedAt = new Date(modifiedTime).toISOString();
  }

  try {
    // A cached observation must precede both its consultation and the current
    // month. An allowed clock skew must not admit an unpublished future month.
    const validationDate = new Date(Math.min(Date.now(), consultedTime));
    const latest = parseLatestInflation(
      [{ fecha: value.referenceDate, valor: value.monthlyPercent }],
      validationDate,
    );
    return {
      ...latest,
      consultedAt: new Date(consultedTime).toISOString(),
      sourceUpdatedAt,
    };
  } catch {
    return null;
  }
}

export function readInflationCache(
  storage: Pick<Storage, "getItem">,
): InflationSnapshot | null {
  try {
    const serialized = storage.getItem(INFLATION_CACHE_KEY);
    if (serialized === null) return null;
    return parseCachedSnapshot(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function writeInflationCache(
  storage: Pick<Storage, "setItem">,
  snapshot: InflationSnapshot,
): void {
  try {
    const validSnapshot = parseCachedSnapshot(snapshot);
    if (validSnapshot !== null) {
      storage.setItem(INFLATION_CACHE_KEY, JSON.stringify(validSnapshot));
    }
  } catch {
    // Unavailable storage or a full quota does not stop the calculator.
  }
}
