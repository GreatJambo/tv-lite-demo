import React from 'react';

export interface UseBinanceWSParams {
  enabled: boolean;
  symbol: string; // e.g., BTCUSDT (uppercase)
  interval: string; // 1m 5m 15m 1h 4h 1d
  onBar: (bar: { time: number; open: number; high: number; low: number; close: number; volume: number }) => void;
}

export function useBinanceWS({ enabled, symbol, interval, onBar }: UseBinanceWSParams) {
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    if (!symbol || !interval) return;
    const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval.toLowerCase()}`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data as string);
          const k = msg?.k;
          if (!k) return;
          const bar = {
            time: Math.floor(k.t / 1000),
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v,
          };
          onBar(bar);
        } catch {}
      };
    } catch {}
    return () => {
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [enabled, symbol, interval, onBar]);
}

