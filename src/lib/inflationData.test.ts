import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchInflation,
  INFLATION_CACHE_KEY,
  INFLATION_CACHE_MAX_AGE_MS,
  INFLATION_REFRESH_INTERVAL,
  INFLATION_SOURCE_URL,
  INFLATION_URL,
  parseLatestInflation,
  readInflationCache,
  writeInflationCache,
} from "./inflationData";
import type { InflationSnapshot } from "./inflationData";

const NOW = "2026-11-16T20:00:00.000Z";

function sourceSeries() {
  return [
    { fecha: "2026-08-31", valor: 1.7 },
    { fecha: "2026-09-30", valor: 1.9 },
    { fecha: "2026-10-31", valor: 2.2 },
  ];
}

function snapshot(): InflationSnapshot {
  return {
    referenceDate: "2026-10-31",
    monthlyPercent: 2.2,
    consultedAt: NOW,
    sourceUpdatedAt: null,
  };
}

function storage(serialized: string | null = null) {
  return {
    getItem: vi.fn(() => serialized),
    setItem: vi.fn<(key: string, value: string) => void>(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseLatestInflation", () => {
  it("preserves monthly percentages without treating them as a ratio or annual rate", () => {
    expect(parseLatestInflation(sourceSeries())).toEqual({
      referenceDate: "2026-10-31",
      monthlyPercent: 2.2,
    });
  });

  it("selects by calendar date even when the payload is not chronological", () => {
    const rows = sourceSeries();
    expect(parseLatestInflation([rows[2], rows[0], rows[1]])).toEqual({
      referenceDate: "2026-10-31",
      monthlyPercent: 2.2,
    });
  });

  it("does not mutate a frozen response", () => {
    const rows = Object.freeze(sourceSeries().map((row) => Object.freeze(row)));
    expect(parseLatestInflation(rows).referenceDate).toBe("2026-10-31");
    expect(rows[0].fecha).toBe("2026-08-31");
  });

  it.each([null, undefined, {}, "[]", 1, false, []])(
    "rejects an invalid series %s",
    (payload) => {
      expect(() => parseLatestInflation(payload)).toThrow("formato no válido");
    },
  );

  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-31",
    "2026-09-00",
    "2026-1-31",
    "2026-09-3",
    "2026-09-30T00:00:00Z",
    "2026-09-30 ",
    "2026",
    "invalid",
    "0000-01-01",
    null,
    123,
  ])("rejects a malformed or impossible reference date %s", (fecha) => {
    expect(() => parseLatestInflation([{ fecha, valor: 2.2 }])).toThrow(
      "fecha no válida",
    );
  });

  it("accepts February 29 in a leap year", () => {
    expect(
      parseLatestInflation([{ fecha: "2024-02-29", valor: 13.2 }]),
    ).toEqual({
      referenceDate: "2024-02-29",
      monthlyPercent: 13.2,
    });
  });

  it.each([
    "2026-11-01",
    "2026-11-16",
    "2026-11-30",
    "2026-12-31",
    "2027-01-31",
  ])("rejects the incomplete current month or a future month %s", (fecha) => {
    expect(() =>
      parseLatestInflation([...sourceSeries(), { fecha, valor: 2 }]),
    ).toThrow("mes actual o futuro");
  });

  it("uses the provided consultation date instead of the machine clock", () => {
    expect(() =>
      parseLatestInflation(sourceSeries(), new Date("2026-10-20T12:00:00Z")),
    ).toThrow("mes actual o futuro");
    expect(
      parseLatestInflation(sourceSeries(), new Date("2026-11-01T00:00:00Z")),
    ).toEqual({
      referenceDate: "2026-10-31",
      monthlyPercent: 2.2,
    });
  });

  it("rejects an invalid consultation date", () => {
    expect(() =>
      parseLatestInflation(sourceSeries(), new Date("invalid")),
    ).toThrow("fecha de consulta");
  });

  it.each([-99, -0.5, 0, 2.2, 1000])(
    "accepts a valid monthly percentage %s",
    (valor) => {
      expect(
        parseLatestInflation([{ fecha: "2026-10-31", valor }]).monthlyPercent,
      ).toBe(valor);
    },
  );

  it.each([-99.01, 1000.01, "2.2", null, undefined, NaN, Infinity, -Infinity])(
    "rejects an invalid monthly percentage %s",
    (valor) => {
      expect(() =>
        parseLatestInflation([{ fecha: "2026-10-31", valor }]),
      ).toThrow("variación mensual no válida");
    },
  );

  it("does not silently substitute an older row when the newest value is invalid", () => {
    expect(() =>
      parseLatestInflation([
        { fecha: "2026-09-30", valor: 1.9 },
        { fecha: "2026-10-31", valor: "unavailable" },
      ]),
    ).toThrow("variación mensual no válida");
  });

  it("does not hide invalid rows anywhere in the series", () => {
    expect(() => parseLatestInflation([null, ...sourceSeries()])).toThrow(
      "fecha no válida",
    );
    expect(() =>
      parseLatestInflation([
        { fecha: "2026-01-31", valor: null },
        ...sourceSeries(),
      ]),
    ).toThrow("variación mensual no válida");
  });

  it("accepts exact duplicate observations but rejects conflicting values", () => {
    expect(
      parseLatestInflation([
        ...sourceSeries(),
        { fecha: "2026-10-31", valor: 2.2 },
      ]).monthlyPercent,
    ).toBe(2.2);
    expect(() =>
      parseLatestInflation([
        ...sourceSeries(),
        { fecha: "2026-10-31", valor: 3 },
      ]),
    ).toThrow("contradictorios");
  });
});

describe("fetchInflation", () => {
  it("requests the monthly endpoint and timestamps the consultation without inventing a release date", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sourceSeries()), {
        headers: { Date: "Mon, 16 Nov 2026 20:00:00 GMT" },
      }),
    );
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();
    await expect(fetchInflation(controller.signal)).resolves.toEqual(
      snapshot(),
    );
    expect(request).toHaveBeenCalledWith(INFLATION_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    expect(INFLATION_URL).not.toContain("interanual");
    expect(INFLATION_SOURCE_URL).toContain("get-finanzas-indices-inflacion");
  });

  it("stores a valid Last-Modified header only as resource metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(sourceSeries()), {
          headers: { "Last-Modified": "Thu, 12 Nov 2026 19:00:00 GMT" },
        }),
      ),
    );
    await expect(fetchInflation()).resolves.toEqual({
      ...snapshot(),
      sourceUpdatedAt: "2026-11-12T19:00:00.000Z",
    });
  });

  it.each(["unavailable", "Fri, 20 Nov 2026 19:00:00 GMT"])(
    "does not use an invalid or future Last-Modified value %s",
    async (header) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(sourceSeries()), {
            headers: { "Last-Modified": header },
          }),
        ),
      );
      expect((await fetchInflation()).sourceUpdatedAt).toBeNull();
    },
  );

  it("reports HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    await expect(fetchInflation()).rejects.toThrow("HTTP 503");
  });

  it("reports connection and JSON errors in Spanish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(fetchInflation()).rejects.toThrow("No se pudo conectar");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>error</html>")),
    );
    await expect(fetchInflation()).rejects.toThrow("respuesta JSON no válida");
  });

  it("validates the response schema after a successful status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"error":"unavailable"}')),
    );
    await expect(fetchInflation()).rejects.toThrow("formato no válido");
  });

  it("preserves AbortError during the request or body consumption", async () => {
    const error = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(fetchInflation()).rejects.toBe(error);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: vi.fn().mockRejectedValue(error),
        }),
    );
    await expect(fetchInflation()).rejects.toBe(error);
  });
});

describe("monthly inflation cache", () => {
  it("round-trips the snapshot with a dedicated versioned key", () => {
    const cache = storage();
    writeInflationCache(cache, snapshot());
    expect(cache.setItem).toHaveBeenCalledWith(
      INFLATION_CACHE_KEY,
      JSON.stringify(snapshot()),
    );
    expect(INFLATION_CACHE_KEY).toMatch(/^v1:/);
    expect(INFLATION_CACHE_KEY).not.toContain("bank-rates");
    expect(readInflationCache(storage(cache.setItem.mock.calls[0][1]))).toEqual(
      snapshot(),
    );
    expect(INFLATION_REFRESH_INTERVAL).toBe(3 * 60 * 60 * 1000);
  });

  it("returns null for an empty cache or corrupted JSON", () => {
    expect(readInflationCache(storage())).toBeNull();
    expect(readInflationCache(storage("{corrupt"))).toBeNull();
  });

  it.each([
    null,
    [],
    {},
    { ...snapshot(), referenceDate: "2026-02-29" },
    { ...snapshot(), referenceDate: "2026-11-01" },
    { ...snapshot(), monthlyPercent: "2.2" },
    { ...snapshot(), monthlyPercent: -100 },
    { ...snapshot(), consultedAt: "2026-11-16" },
    { ...snapshot(), consultedAt: "invalid" },
    { ...snapshot(), sourceUpdatedAt: undefined },
    { ...snapshot(), sourceUpdatedAt: "invalid" },
    { ...snapshot(), sourceUpdatedAt: "2026-11-16T20:05:00.001Z" },
  ])("ignores an invalid cached snapshot %s", (value) => {
    expect(readInflationCache(storage(JSON.stringify(value)))).toBeNull();
  });

  it("expires after seven days, including the boundary", () => {
    const consultedAt = new Date(
      Date.now() - INFLATION_CACHE_MAX_AGE_MS,
    ).toISOString();
    expect(
      readInflationCache(
        storage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).not.toBeNull();
    const expiredAt = new Date(
      Date.now() - INFLATION_CACHE_MAX_AGE_MS - 1,
    ).toISOString();
    expect(
      readInflationCache(
        storage(JSON.stringify({ ...snapshot(), consultedAt: expiredAt })),
      ),
    ).toBeNull();
  });

  it("allows up to five minutes of clock skew but rejects later consultations", () => {
    const consultedAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    expect(
      readInflationCache(
        storage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).not.toBeNull();
    const futureAt = new Date(Date.now() + 5 * 60 * 1000 + 1).toISOString();
    expect(
      readInflationCache(
        storage(JSON.stringify({ ...snapshot(), consultedAt: futureAt })),
      ),
    ).toBeNull();
  });

  it("does not admit a reference month that was incomplete when the cache was consulted", () => {
    vi.setSystemTime(new Date("2026-11-01T00:01:00Z"));
    const value = { ...snapshot(), consultedAt: "2026-10-31T23:59:00.000Z" };
    expect(readInflationCache(storage(JSON.stringify(value)))).toBeNull();
  });

  it("preserves optional resource metadata without synthesizing it", () => {
    const value = {
      ...snapshot(),
      sourceUpdatedAt: "2026-11-12T19:00:00.000Z",
    };
    expect(readInflationCache(storage(JSON.stringify(value)))).toEqual(value);
  });

  it("does not break when storage is unavailable or its quota is full", () => {
    const cache = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };
    expect(readInflationCache(cache)).toBeNull();
    expect(() => writeInflationCache(cache, snapshot())).not.toThrow();
  });

  it("does not write an invalid snapshot", () => {
    const cache = storage();
    writeInflationCache(cache, { ...snapshot(), consultedAt: "invalid" });
    expect(cache.setItem).not.toHaveBeenCalled();
  });
});
