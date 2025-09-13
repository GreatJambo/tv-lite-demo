export type Bar = {
  time: number; // UTCTimestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export interface UseKlinesParams {
  source: string;
  symbol: string;
  interval: string;
  limit?: number;
  auto?: boolean; // if true, fetch immediately on mount/param change
}

export function useKlines({ source, symbol, interval, limit = 800, auto = true }: UseKlinesParams) {
  const state = React.useRef<{ mounted: boolean }>({ mounted: false });
  const [data, setData] = React.useState<Bar[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOnce = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/klines?source=${encodeURIComponent(source)}&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Proxy API ${res.status}`);
      const json = (await res.json()) as Bar[];
      setData(json);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [source, symbol, interval, limit]);

  const reload = React.useCallback(() => {
    const ac = new AbortController();
    fetchOnce(ac.signal);
    return ac;
  }, [fetchOnce]);

  React.useEffect(() => {
    state.current.mounted = true;
    let ac: AbortController | null = null;
    if (auto) {
      ac = reload();
    }
    return () => {
      state.current.mounted = false;
      ac?.abort();
    };
  }, [auto, reload]);

  return { data, loading, error, reload } as const;
}

import React from 'react';

