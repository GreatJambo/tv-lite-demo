import React, { useEffect, useRef } from 'react';
import type { IChartApi, IPaneApi } from 'lightweight-charts';
import { LineSeries, HistogramSeries } from 'lightweight-charts';
import type { Bar } from '../hooks/useKlines';

interface Props {
  chart: IChartApi;
  data: Bar[];
  visible: boolean;
}

function emaN(values: number[], p: number) {
  const k = 2 / (p + 1);
  let e = values[0] ?? 0;
  const out = [e];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

export const MACDPane: React.FC<Props> = ({ chart, data, visible }) => {
  const paneRef = useRef<IPaneApi | null>(null);
  const macdRef = useRef<ReturnType<IPaneApi['addSeries']> | null>(null);
  const signalRef = useRef<ReturnType<IPaneApi['addSeries']> | null>(null);
  const histRef = useRef<ReturnType<IPaneApi['addSeries']> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (paneRef.current) return;
    const pane = chart.addPane();
    const macdLine = pane.addSeries(LineSeries, { color: 'lime', lineWidth: 2 });
    const sigLine = pane.addSeries(LineSeries, { color: 'red', lineWidth: 2 });
    const hist = pane.addSeries(HistogramSeries, { color: 'rgba(0,150,136,0.5)' });
    paneRef.current = pane;
    macdRef.current = macdLine;
    signalRef.current = sigLine;
    histRef.current = hist;

    return () => {
      if (!paneRef.current) return;
      const idx = paneRef.current.paneIndex();
      try { chart.removePane(idx); } catch {}
      paneRef.current = null;
      macdRef.current = null;
      signalRef.current = null;
      histRef.current = null;
    };
  }, [chart, visible]);

  useEffect(() => {
    if (!visible) return;
    const macdLine = macdRef.current;
    const sigLine = signalRef.current;
    const hist = histRef.current;
    if (!macdLine || !sigLine || !hist) return;
    if (!data || data.length === 0) { macdLine.setData([]); sigLine.setData([]); hist.setData([]); return; }

    const times = data.map(d => d.time);
    const closes = data.map(d => d.close);

    const ema12 = emaN(closes, 12);
    const ema26 = emaN(closes, 26).slice(0, ema12.length);
    const macdArr = ema12.map((v, i) => v - ema26[i]).slice(26 - 1);
    const k = 2 / (9 + 1);
    let e = macdArr[0] ?? 0;
    const signalArr = [e];
    for (let i = 1; i < macdArr.length; i++) {
      e = macdArr[i] * k + e * (1 - k);
      signalArr.push(e);
    }
    const histArr = macdArr.map((v, i) => v - signalArr[i]);

    macdLine.setData(macdArr.map((v, i) => ({ time: times[i + 26 - 1], value: v })));
    sigLine.setData(signalArr.map((v, i) => ({ time: times[i + 26 - 1], value: v })));
    hist.setData(histArr.map((v, i) => ({ time: times[i + 26 - 1], value: v })));
  }, [data, visible]);

  return null;
};

