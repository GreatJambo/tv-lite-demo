import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { LineSeries, createSeriesMarkers, LineStyle } from 'lightweight-charts';

type CandleSeries = ISeriesApi<'Candlestick'>;

interface Props {
  chart: IChartApi;
  candle: CandleSeries;
  resetKey?: string; // e.g., `${source}|${symbol}|${interval}` to clear on data change
}

export const FibTool: React.FC<Props> = ({ chart, candle, resetKey }) => {
  const [active, setActive] = useState(false);
  const [extend, setExtend] = useState(true);
  const anchorRef = useRef<{ time: number; price: number } | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']>[]>([]);
  const priceLinesRef = useRef<ReturnType<CandleSeries['createPriceLine']>[]>([]);
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);

  // Create markers primitive once
  useEffect(() => {
    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(candle, [], { zOrder: 'top' });
    }
    return () => {
      markersRef.current?.setMarkers([]);
      markersRef.current = null;
    };
  }, [candle]);

  const clear = useMemo(() => {
    return () => {
      for (const s of seriesRef.current) {
        try { chart.removeSeries(s); } catch {}
      }
      seriesRef.current = [];
      for (const pl of priceLinesRef.current) {
        try { candle.removePriceLine(pl); } catch {}
      }
      priceLinesRef.current = [];
      markersRef.current?.setMarkers([]);
      anchorRef.current = null;
    };
  }, [chart, candle]);

  // Clear on reset signal (data/source/interval changes)
  useEffect(() => { clear(); }, [clear, resetKey]);

  // Click handler
  useEffect(() => {
    function onClick(param: any) {
      if (!active) return;
      if (!param || !param.point || param.time === undefined) return;
      const y: number = param.point.y;
      const price = candle.coordinateToPrice(y);
      if (price == null) return;
      if (!anchorRef.current) {
        anchorRef.current = { time: param.time, price };
        markersRef.current?.setMarkers([
          { time: anchorRef.current.time, price: anchorRef.current.price, position: 'atPriceMiddle', shape: 'circle', color: '#f59e0b', text: 'A', size: 2 },
        ]);
      } else {
        const a = anchorRef.current;
        clear();
        const b = { time: param.time, price };
        addLevels(a, b);
        markersRef.current?.setMarkers([
          { time: a.time, price: a.price, position: 'atPriceMiddle', shape: 'circle', color: '#f59e0b', text: 'A', size: 2 },
          { time: b.time, price: b.price, position: 'atPriceMiddle', shape: 'circle', color: '#22d3ee', text: 'B', size: 2 },
        ]);
        anchorRef.current = null;
      }
    }
    chart.subscribeClick(onClick);
    return () => chart.unsubscribeClick(onClick);
  }, [chart, candle, active, extend, clear]);

  function addLevels(a: { time: number; price: number }, b: { time: number; price: number }) {
    const t1 = a.time <= b.time ? a.time : b.time;
    const t2 = a.time <= b.time ? b.time : a.time;
    const p1 = a.price;
    const p2 = b.price;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const color = '#94a3b8';
    const boldColor = '#f59e0b';
    for (const L of levels) {
      const v = p2 + (p1 - p2) * L;
      const lvColor = (L === 0.618 || L === 0.382) ? boldColor : color;
      const s = chart.addSeries(LineSeries, {
        color: lvColor,
        lineWidth: (L === 0.618 || L === 0.382) ? 2 : 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s.setData([
        { time: t1 as any, value: v },
        { time: t2 as any, value: v },
      ]);
      seriesRef.current.push(s);

      const pl = candle.createPriceLine({
        price: v,
        color: lvColor,
        lineStyle: LineStyle.Dotted,
        lineWidth: 1,
        lineVisible: extend,
        axisLabelVisible: true,
        title: `${(L * 100).toFixed(1)}% ${v.toFixed(2)}`,
        axisLabelColor: lvColor,
        axisLabelTextColor: '#0f172a',
      });
      priceLinesRef.current.push(pl);
    }
  }

  // When extend toggles, update existing price lines
  useEffect(() => {
    for (const pl of priceLinesRef.current) pl.applyOptions({ lineVisible: extend });
  }, [extend]);

  return (
    <div className="toolbar-left">
      <button className={`tool-btn${active ? ' active' : ''}`} title="Fib" onClick={() => setActive(v => !v)}>Fib</button>
      <button className={`tool-btn${extend ? ' active' : ''}`} title="延长" onClick={() => setExtend(v => !v)}>⇔</button>
      <button className="tool-btn" title="清除" onClick={() => clear()}>✕</button>
    </div>
  );
};

