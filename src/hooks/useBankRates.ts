import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRates,
  readRateCache,
  writeRateCache,
  RATE_CACHE_MAX_AGE_MS,
} from "../lib/rates";
import type { RateSnapshot } from "../lib/rates";

export const RATE_REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

function initialCache() {
  try {
    return readRateCache(window.localStorage);
  } catch {
    return null;
  }
}

export function useBankRates() {
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(initialCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!snapshot);
  const [now, setNow] = useState(Date.now);
  const latest = useRef(snapshot);
  const lastAttempt = useRef(0);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const time = Date.now();
    const age = latest.current
      ? time - Date.parse(latest.current.consultedAt)
      : Infinity;
    if (latest.current && age > RATE_CACHE_MAX_AGE_MS) {
      latest.current = null;
      setSnapshot(null);
      setFromCache(false);
    }
    if (
      request.current ||
      age < RATE_REFRESH_INTERVAL ||
      time - lastAttempt.current < 60_000
    )
      return;
    lastAttempt.current = time;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const next = await fetchRates(controller.signal);
      if (controller.signal.aborted) return;
      latest.current = next;
      setSnapshot(next);
      setFromCache(false);
      setNow(Date.now());
      try {
        writeRateCache(window.localStorage, next);
      } catch {
        /* Storage is optional. */
      }
    } catch {
      if (request.current !== controller) return;
      setError(
        "No pudimos consultar las tasas. Revisá tu conexión y volvé a intentar.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const check = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      request.current?.abort();
      request.current = null;
      lastAttempt.current = 0;
    };
  }, [refresh]);

  const stale =
    !!snapshot &&
    now - Date.parse(snapshot.consultedAt) >= RATE_REFRESH_INTERVAL;
  const canRefresh =
    !loading && (!snapshot || stale) && now - lastAttempt.current >= 60_000;
  return { snapshot, loading, error, fromCache, stale, canRefresh, refresh };
}
