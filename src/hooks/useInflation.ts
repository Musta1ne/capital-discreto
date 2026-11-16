import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchInflation,
  readInflationCache,
  writeInflationCache,
  INFLATION_CACHE_MAX_AGE_MS,
  INFLATION_REFRESH_INTERVAL,
} from "../lib/inflationData";
import type { InflationSnapshot } from "../lib/inflationData";

function initialCache() {
  try {
    return readInflationCache(window.localStorage);
  } catch {
    return null;
  }
}

/** Independent from bank rates; no request is made until the feature needs IPC. */
export function useInflation(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<InflationSnapshot | null>(
    initialCache,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!snapshot);
  const [now, setNow] = useState(Date.now);
  const latest = useRef(snapshot);
  const lastAttempt = useRef(0);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const time = Date.now();
    const age = latest.current
      ? time - Date.parse(latest.current.consultedAt)
      : Infinity;
    if (latest.current && age > INFLATION_CACHE_MAX_AGE_MS) {
      latest.current = null;
      setSnapshot(null);
      setFromCache(false);
    }
    if (
      request.current ||
      age < INFLATION_REFRESH_INTERVAL ||
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
      const next = await fetchInflation(controller.signal);
      if (controller.signal.aborted) return;
      latest.current = next;
      setSnapshot(next);
      setFromCache(false);
      setNow(Date.now());
      try {
        writeInflationCache(window.localStorage, next);
      } catch {
        /* Optional storage. */
      }
    } catch {
      if (request.current !== controller) return;
      setError(
        "No pudimos consultar la inflación. Podés reintentar o ingresar una estimación manual.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
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
      if (request.current) {
        request.current.abort();
        request.current = null;
        lastAttempt.current = 0;
      }
      setLoading(false);
    };
  }, [enabled, refresh]);

  // A feature re-enabled after a long pause must not expose an expired snapshot.
  const currentTime = Math.max(now, Date.now());
  const available =
    snapshot &&
    currentTime - Date.parse(snapshot.consultedAt) <= INFLATION_CACHE_MAX_AGE_MS
      ? snapshot
      : null;
  const stale =
    !!available &&
    currentTime - Date.parse(available.consultedAt) >=
      INFLATION_REFRESH_INTERVAL;
  const canRefresh =
    enabled &&
    !loading &&
    (!available || stale) &&
    currentTime - lastAttempt.current >= 60_000;
  return {
    snapshot: available,
    loading,
    error,
    fromCache,
    stale,
    canRefresh,
    refresh,
  };
}
