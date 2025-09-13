import React, { useEffect, useRef } from 'react';
import type { IChartApi, IPaneApi } from 'lightweight-charts';
import { HistogramSeries } from 'lightweight-charts';
import type { Bar } from '../hooks/useKlines';

interface Props {
  chart: IChartApi;
  data: Bar[];
  visible: boolean;
}

export const VolumePane: React.FC<Props> = ({ chart, data, visible }) => {
  const paneRef = useRef<IPaneApi | null>(null);
  const seriesRef = useRef<ReturnType<IPaneApi['addSeries']> | null>(null);

  // Create & destroy pane
  useEffect(() => {
    if (!visible) return;
    if (paneRef.current) return;
    const pane = chart.addPane();
    const series = pane.addSeries(HistogramSeries, {
      color: 'rgba(148, 163, 184, 0.6)',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: 'volume' },
    });
    paneRef.current = pane;
    seriesRef.current = series;

    // Ensure Volume pane is directly after main
    try {
      const panes = chart.panes();
      if (pane.paneIndex() !== 1 && panes.length > 1) pane.moveTo(1);
    } catch {}

    return () => {
      if (!paneRef.current) return;
      const idx = paneRef.current.paneIndex();
      try { chart.removePane(idx); } catch {}
      paneRef.current = null;
      seriesRef.current = null;
    };
  }, [chart, visible]);

  // Apply data
  useEffect(() => {
    if (!visible) return;
    const s = seriesRef.current;
    if (!s) return;
    const volData = data.map(d => ({
      time: d.time,
      value: d.volume ?? 0,
      color: (d.close >= d.open) ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
    }));
    s.setData(volData);
  }, [data, visible]);

  return null;
};

