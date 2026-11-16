import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchRates,
  parseRates,
  RATE_SOURCE_URL,
  RATES_URL,
  readRateCache,
  writeRateCache,
} from "./rates";
import type { RateSnapshot } from "./rates";

const NOW = "2026-11-16T15:00:00.000Z";

function sourceBank(overrides: Record<string, unknown> = {}) {
  return {
    entidad: "Banco Córdoba",
    tnaClientes: 0.1925,
    tnaNoClientes: 0.2,
    enlace: "https://banco.example/plazo-fijo",
    condiciones: "Solo para colocaciones por canal electrónico.",
    ...overrides,
  };
}

function snapshot(): RateSnapshot {
  return { banks: parseRates([sourceBank()]), consultedAt: NOW };
}

function cacheStorage(serialized: string | null) {
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

describe("parseRates", () => {
  it("normalizes root 30-day ratios into TNA percentages", () => {
    expect(parseRates([sourceBank()])).toEqual([
      {
        id: "banco-cordoba",
        name: "Banco Córdoba",
        clientRate: 19.25,
        nonClientRate: 20,
        link: "https://banco.example/plazo-fijo",
        conditions: "Solo para colocaciones por canal electrónico.",
      },
    ]);
  });

  it("keeps source order and deduplicates stable normalized names", () => {
    const banks = parseRates([
      sourceBank({ entidad: "  Banco Córdoba  " }),
      sourceBank({ entidad: "Otro Banco S.A.", tnaClientes: 0.3 }),
      sourceBank({ entidad: "BANCO CORDOBA", tnaClientes: 0.8 }),
    ]);
    expect(banks.map((bank) => bank.id)).toEqual([
      "banco-cordoba",
      "otro-banco-s-a",
    ]);
    expect(banks[0].name).toBe("Banco Córdoba");
    expect(banks[0].clientRate).toBe(19.25);
  });

  it("does not let a missing offer shadow a later valid duplicate", () => {
    const banks = parseRates([
      sourceBank({ tnaClientes: 0, tnaNoClientes: 0 }),
      sourceBank({ tnaClientes: 0.3 }),
    ]);
    expect(banks).toHaveLength(1);
    expect(banks[0].clientRate).toBe(30);
  });

  it("uses null for an unavailable non-client offer", () => {
    expect(
      parseRates([sourceBank({ tnaNoClientes: 0 })])[0].nonClientRate,
    ).toBeNull();
  });

  it("allows an offer available only for non-clients", () => {
    const bank = parseRates([sourceBank({ tnaClientes: undefined })])[0];
    expect(bank.clientRate).toBeNull();
    expect(bank.nonClientRate).toBe(20);
  });

  it.each([
    0,
    -0.1,
    10.01,
    "0.3",
    null,
    undefined,
    Number.NaN,
    Infinity,
    -Infinity,
  ])("marks an invalid or unavailable client ratio %s as missing", (value) => {
    expect(
      parseRates([sourceBank({ tnaClientes: value })])[0].clientRate,
    ).toBeNull();
  });

  it("supports the maximum documented ratio", () => {
    expect(parseRates([sourceBank({ tnaClientes: 10 })])[0].clientRate).toBe(
      1000,
    );
  });

  it("omits unavailable banks instead of treating zero as a genuine offer", () => {
    expect(
      parseRates([
        sourceBank({ entidad: "Sin Oferta", tnaClientes: 0, tnaNoClientes: 0 }),
        sourceBank(),
      ]),
    ).toHaveLength(1);
  });

  it.each([null, undefined, {}, "[]", 123, false])(
    "rejects malformed payload %s with a Spanish message",
    (payload) => {
      expect(() => parseRates(payload)).toThrow("formato no válido");
    },
  );

  it.each([
    [],
    [null, false, 123],
    [{ entidad: "   ", tnaClientes: 0.3 }],
    [{ tnaClientes: 0.3 }],
    [{ entidad: "🏦", tnaClientes: 0.3 }],
    [sourceBank({ tnaClientes: 0, tnaNoClientes: 0 })],
    [sourceBank({ tnaClientes: "0.3", tnaNoClientes: null })],
  ])("rejects payload without a valid offer: %s", (...rows) => {
    // Vitest expands each array in it.each into the test arguments.
    expect(() => parseRates(rows)).toThrow(
      "ofertas de plazo fijo válidas a 30 días",
    );
  });

  it("skips invalid rows while preserving valid banks", () => {
    const banks = parseRates([
      null,
      {},
      { entidad: " " },
      sourceBank(),
      "invalid",
    ]);
    expect(banks).toHaveLength(1);
  });

  it("does not substitute offers with another placement length", () => {
    const bank = parseRates([
      sourceBank({
        tnaClientes: 0.2,
        tasas: [{ plazoMinDias: 90, plazoMaxDias: 180, tna: 0.8 }],
      }),
    ])[0];
    expect(bank.clientRate).toBe(20);
    expect(() =>
      parseRates([
        sourceBank({
          tnaClientes: 0,
          tnaNoClientes: 0,
          tasas: [{ plazoMinDias: 90, tna: 0.8 }],
        }),
      ]),
    ).toThrow();
  });

  it.each(["https://banco.example/tasas", "http://banco.example/tasas"])(
    "accepts an absolute http(s) source link %s",
    (link) => {
      expect(parseRates([sourceBank({ enlace: link })])[0].link).toBe(link);
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///secret",
    "/relative",
    "bad",
    1,
    null,
  ])("rejects an unsafe or malformed source link %s", (link) => {
    expect(parseRates([sourceBank({ enlace: link })])[0].link).toBeNull();
  });

  it("preserves source conditions and falls back to the short description", () => {
    const bank = parseRates([
      sourceBank({
        condiciones: " ",
        condicionesCorto: "  Solo clientes  ",
      }),
    ])[0];
    expect(bank.conditions).toBe("Solo clientes");
    expect(
      parseRates([sourceBank({ condiciones: 42 })])[0].conditions,
    ).toBeNull();
  });

  it("does not mutate the source payload", () => {
    const row = Object.freeze(sourceBank());
    expect(() => parseRates(Object.freeze([row]))).not.toThrow();
    expect(row.tnaClientes).toBe(0.1925);
  });
});

describe("fetchRates", () => {
  it("fetches the public endpoint and timestamps the consultation", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([sourceBank()])));
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();
    const result = await fetchRates(controller.signal);
    expect(request).toHaveBeenCalledWith(RATES_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    expect(result).toEqual(snapshot());
    expect(RATE_SOURCE_URL).toContain(
      "/docs/operations/get-finanzas-tasas-plazo-fijo",
    );
  });

  it("reports an HTTP failure without parsing its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    await expect(fetchRates()).rejects.toThrow("HTTP 503");
  });

  it("reports connection failures in Spanish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(fetchRates()).rejects.toThrow("No se pudo conectar");
  });

  it("reports invalid JSON in Spanish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>error</html>")),
    );
    await expect(fetchRates()).rejects.toThrow("respuesta JSON no válida");
  });

  it("validates the actual JSON schema rather than accepting any success body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: "oops" }))),
    );
    await expect(fetchRates()).rejects.toThrow("formato no válido");
  });

  it("does not invent offers from an empty success response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]")));
    await expect(fetchRates()).rejects.toThrow("ofertas de plazo fijo válidas");
  });

  it("preserves AbortError for the caller timeout handling", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(fetchRates(controller.signal)).rejects.toBe(error);
  });

  it("preserves an abort that happens while reading the body", async () => {
    const error = new DOMException("Aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(error),
      }),
    );
    await expect(fetchRates()).rejects.toBe(error);
  });
});

describe("rate cache", () => {
  it("round-trips normalized percentages without multiplying by 100 again", () => {
    const storage = cacheStorage(null);
    const value = snapshot();
    writeRateCache(storage, value);
    expect(storage.setItem).toHaveBeenCalledOnce();
    const [key, serialized] = storage.setItem.mock.calls[0];
    expect(key).toMatch(/^v1:/);
    expect(readRateCache(cacheStorage(serialized))).toEqual(value);
    expect(readRateCache(cacheStorage(serialized))?.banks[0].clientRate).toBe(
      19.25,
    );
  });

  it("returns null when storage has no cache", () => {
    expect(readRateCache(cacheStorage(null))).toBeNull();
  });

  it("ignores corrupt JSON", () => {
    expect(readRateCache(cacheStorage("{corrupt"))).toBeNull();
  });

  it.each([
    null,
    [],
    {},
    { consultedAt: NOW },
    { banks: [] },
    { banks: [], consultedAt: NOW },
  ])("ignores invalid cached structure %s", (value) => {
    expect(readRateCache(cacheStorage(JSON.stringify(value)))).toBeNull();
  });

  it.each(["invalid", "2026", "2026-11-99T15:00:00.000Z", "", null, 123])(
    "rejects an invalid consultation timestamp %s",
    (consultedAt) => {
      expect(
        readRateCache(
          cacheStorage(JSON.stringify({ ...snapshot(), consultedAt })),
        ),
      ).toBeNull();
    },
  );

  it("expires caches older than seven days", () => {
    const consultedAt = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000 - 1,
    ).toISOString();
    expect(
      readRateCache(
        cacheStorage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).toBeNull();
  });

  it("accepts a cache that is exactly seven days old", () => {
    const consultedAt = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      readRateCache(
        cacheStorage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).not.toBeNull();
  });

  it("rejects consultation timestamps more than five minutes in the future", () => {
    const consultedAt = new Date(Date.now() + 5 * 60 * 1000 + 1).toISOString();
    expect(
      readRateCache(
        cacheStorage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).toBeNull();
  });

  it("allows a clock difference of up to five minutes", () => {
    const consultedAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    expect(
      readRateCache(
        cacheStorage(JSON.stringify({ ...snapshot(), consultedAt })),
      ),
    ).not.toBeNull();
  });

  it.each([
    { clientRate: -1 },
    { clientRate: 0 },
    { clientRate: 1001 },
    { clientRate: "19.25" },
    { clientRate: undefined },
    { clientRate: null, nonClientRate: null },
    { id: "wrong-bank" },
    { name: "" },
    { link: "javascript:alert(1)" },
    { link: undefined },
    { conditions: {} },
  ])("rejects untrusted cached bank data %s", (overrides) => {
    const value = {
      ...snapshot(),
      banks: [{ ...snapshot().banks[0], ...overrides }],
    };
    expect(readRateCache(cacheStorage(JSON.stringify(value)))).toBeNull();
  });

  it("rejects duplicate bank IDs in cached data", () => {
    const value = snapshot();
    value.banks.push({ ...value.banks[0] });
    expect(readRateCache(cacheStorage(JSON.stringify(value)))).toBeNull();
  });

  it("does not break when storage is unavailable or private", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };
    expect(readRateCache(storage)).toBeNull();
    expect(() => writeRateCache(storage, snapshot())).not.toThrow();
  });

  it("does not write an invalid or expired snapshot", () => {
    const storage = cacheStorage(null);
    writeRateCache(storage, { ...snapshot(), consultedAt: "invalid" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
