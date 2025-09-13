import React, { useEffect, useRef } from 'react';
import type { IChartApi, IPaneApi } from 'lightweight-charts';
import { LineSeries } from 'lightweight-charts';
import type { Bar } from '../hooks/useKlines';

interface Props {
  chart: IChartApi;
  data: Bar[];
  visible: boolean;
}

function calcRsi(values: number[], period = 14): number[] {
  const out: number[] = [];
  let gains = 0, losses = 0;
  for (let i = 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    gains += Math.max(ch, 0);
    losses += Math.max(-ch, 0);
    if (i >= period) {
      const prevCh = values[i - period + 1] - values[i - period];
      gains -= Math.max(prevCh, 0);
      losses -= Math.max(-prevCh, 0);
    }
    if (i >= period) {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      out.push(rsi);
    }
  }
  return out;
}

export const RSIPane: React.FC<Props> = ({ chart, data, visible }) => {
  const paneRef = useRef<IPaneApi | null>(null);
  const seriesRef = useRef<ReturnType<IPaneApi['addSeries']> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (paneRef.current) return;
    const pane = chart.addPane();
    const series = pane.addSeries(LineSeries, { color: 'yellow', lineWidth: 2 });
    paneRef.current = pane;
    seriesRef.current = series;

    return () => {
      if (!paneRef.current) return;
      const idx = paneRef.current.paneIndex();
      try { chart.removePane(idx); } catch {}
      paneRef.current = null;
      seriesRef.current = null;
    };
  }, [chart, visible]);

  useEffect(() => {
    if (!visible) return;
    const s = seriesRef.current;
    if (!s) return;
    if (!data || data.length === 0) { s.setData([]); return; }

    const times = data.map(d => d.time);
    const closes = data.map(d => d.close);
    const rsiVals = calcRsi(closes, 14);
    s.setData(rsiVals.map((v, i) => ({ time: times[i + 14 - 1], value: v })));
  }, [data, visible]);

  return null;
};

