import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import { useKlines, type Bar } from '../hooks/useKlines';
import { VolumePane } from '../panes/VolumePane';
import { RSIPane } from '../panes/RSIPane';
import { MACDPane } from '../panes/MACDPane';
import { TopBar, type Source, type Interval } from '../ui/TopBar';
import { IndicatorPanel } from '../ui/IndicatorPanel';
import { useBinanceWS } from '../hooks/useBinanceWS';
import { FibTool } from '../tools/FibTool';

export const ChartContainer: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const candleRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const closeLineRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const smaSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const emaSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const ohlcRef = useRef<Bar[]>([]);
  const [viewData, setViewData] = useState<Bar[] | null>(null);
  const [rightPadBars, setRightPadBars] = useState(2);

  const [source, setSource] = useState<Source>('auto');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('1d');
  const { data, loading, error, reload } = useKlines({ source, symbol, interval, limit: 800, auto: true });
  const [showVolume, setShowVolume] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [indOpen, setIndOpen] = useState(false);

  useEffect(() => {
    const el = hostRef.current!;
    // Create chart with dark layout to match current app look
    const chart = createChart(el, {
      layout: { background: { color: '#0f172a' }, textColor: '#eee' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#334155' },
      crosshair: { mode: 0 },
      timeScale: { borderColor: '#334155', timeVisible: true, secondsVisible: false, fixRightEdge: true, rightOffset: 2 },
    });
    chartRef.current = chart;

    // --- Helpers ---
    function sma(values: number[], p: number) {
      const out: number[] = [];
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= p) sum -= values[i - p];
        if (i >= p - 1) out.push(sum / p);
      }
      return out;
    }
    function ema(values: number[], p: number) {
      const k = 2 / (p + 1);
      const out: number[] = [];
      let prev = values[0] ?? 0;
      for (let i = 0; i < values.length; i++) {
        if (i === 0) {
          out.push(prev);
        } else {
          prev = values[i] * k + prev * (1 - k);
          out.push(prev);
        }
      }
      return out.slice(p - 1);
    }

    // --- Series ---
    const candleSeries = chart.addSeries(CandlestickSeries);
    const closeLine = chart.addSeries(LineSeries, { color: '#7aa2f7', lineWidth: 1 });
    const smaSeries = chart.addSeries(LineSeries, { color: 'orange', lineWidth: 2 });
    const emaSeries = chart.addSeries(LineSeries, { color: 'cyan', lineWidth: 2 });
    candleRef.current = candleSeries;
    closeLineRef.current = closeLine;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;

    // Resize handling
    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = el;
      chart.resize(clientWidth, clientHeight);
    });
    ro.observe(el);
    resizeObsRef.current = ro;

    // Initial size
    chart.resize(el.clientWidth, el.clientHeight);

    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  // --- Range helpers ---
  const defaultWindow = useMemo(() => {
    switch (interval) {
      case '1m':
      case '5m':
      case '15m':
        return 300;
      case '1h':
      case '4h':
        return 400;
      case '1d':
      default:
        return 220;
    }
  }, [interval]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // right offset
    chart.timeScale().applyOptions({ rightOffset: rightPadBars });
  }, [rightPadBars]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // clamp right scroll
    let clampLock = false;
    const clampRightLimit = () => {
      if (clampLock) return;
      const ts = chart.timeScale();
      const r = ts.getVisibleLogicalRange();
      if (!r) return;
      const len = ohlcRef.current.length;
      if (len === 0) return;
      const maxTo = (len - 1) + rightPadBars;
      if (r.to > maxTo) {
        clampLock = true;
        const width = r.to - r.from;
        const newTo = maxTo;
        const newFrom = newTo - width;
        ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
        clampLock = false;
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(clampRightLimit);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(clampRightLimit);
    };
  }, [rightPadBars]);

  // --- Apply loaded data ---
  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    const closeLine = closeLineRef.current;
    const smaSeries = smaSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    if (!chart || !candle || !closeLine || !smaSeries || !emaSeries) return;
    if (!data || data.length === 0) return;

    const preserve = ohlcRef.current.length > 0; // keep current range if already set
    ohlcRef.current = data;
    setViewData(data);
    const times = data.map(d => d.time);
    const closes = data.map(d => d.close);
    candle.setData(data);
    closeLine.setData(data.map(d => ({ time: d.time, value: d.close })));

    const sma20 = (function(values: number[]) { return (function(v:number[],p:number){const out:number[]=[];let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)out.push(s/p);}return out;})(values,20); })(closes);
    const ema50 = (function(values: number[]){const k=2/(50+1);const out:number[]=[];let prev=values[0]??0;for(let i=0;i<values.length;i++){if(i===0){out.push(prev);}else{prev=values[i]*k+prev*(1-k);out.push(prev);}}return out.slice(50-1);} )(closes);
    smaSeries.setData(sma20.map((v, i) => ({ time: times[i + 20 - 1], value: v })));
    emaSeries.setData(ema50.map((v, i) => ({ time: times[i + 50 - 1], value: v })));

    const ts = chart.timeScale();
    if (preserve) {
      const r = ts.getVisibleLogicalRange();
      if (r) ts.setVisibleLogicalRange(r);
    } else {
      const last = data.length - 1;
      const from = Math.max(0, last - defaultWindow);
      ts.setVisibleLogicalRange({ from, to: last + rightPadBars });
    }
    // force clamp once
    const r = ts.getVisibleLogicalRange();
    if (r) ts.setVisibleLogicalRange(r);
  }, [data, defaultWindow, rightPadBars]);

  // --- Realtime: Binance WS ---
  const clampNow = React.useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const r = ts.getVisibleLogicalRange();
    if (!r) return;
    const len = ohlcRef.current.length;
    if (len === 0) return;
    const maxTo = (len - 1) + rightPadBars;
    if (r.to > maxTo) {
      const width = r.to - r.from;
      const newTo = maxTo;
      const newFrom = newTo - width;
      ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
    }
  }, [rightPadBars]);

  const onWsBar = React.useCallback((bar: Bar) => {
    const candle = candleRef.current; if (!candle) return;
    const closeLine = closeLineRef.current; const smaS = smaSeriesRef.current; const emaS = emaSeriesRef.current;
    const arr = ohlcRef.current;
    const last = arr[arr.length - 1];
    if (last && last.time === bar.time) {
      arr[arr.length - 1] = bar;
    } else if (!last || bar.time > last.time) {
      arr.push(bar);
    } else {
      return; // ignore out-of-order
    }
    // main series update
    candle.update(bar);
    closeLine?.update({ time: bar.time, value: bar.close });
    // SMA20/EMA50 incremental
    const closes = arr.map(d => d.close);
    // last SMA20
    if (smaS) {
      if (closes.length >= 20) {
        const last20 = closes.slice(-20);
        const smaVal = last20.reduce((a, b) => a + b, 0) / 20;
        smaS.update({ time: bar.time, value: smaVal });
      }
    }
    if (emaS) {
      if (closes.length >= 50) {
        const subset = closes.slice(-50);
        const k = 2 / (50 + 1); let e = subset[0];
        for (let i = 1; i < subset.length; i++) e = subset[i] * k + e * (1 - k);
        emaS.update({ time: bar.time, value: e });
      }
    }
    // trigger UI re-render for pane components
    setViewData([...arr]);
    // keep right clamp
    clampNow();
  }, [clampNow]);

  useBinanceWS({ enabled: source === 'binance', symbol, interval, onBar: onWsBar });

  // toggle visibility for SMA/EMA
  useEffect(() => {
    smaSeriesRef.current?.applyOptions({ visible: showSMA });
  }, [showSMA]);
  useEffect(() => {
    emaSeriesRef.current?.applyOptions({ visible: showEMA });
  }, [showEMA]);

  // Adjust pane stretch: main 0.6, others share 0.4
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const panes = chart.panes();
    if (panes.length === 0) return;
    const main = panes[0];
    main.setStretchFactor(1); // will normalize later
    const activeCount = panes.length - 1; // exclude main
    if (activeCount <= 0) return;
    const mainFactor = 0.6;
    const rest = 0.4;
    const each = rest / activeCount;
    main.setStretchFactor(mainFactor);
    for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(each);
  }, [showVolume, showRSI, showMACD, data]);

  // preset handler
  function applyPreset(v: string) {
    if (!v) return;
    const [ns, iv] = v.split('|');
    const [provider, sym] = ns.split(':');
    const src: Source = provider === 'BINANCE' ? 'binance' : (provider === 'YF' ? 'yahoo' : 'binance');
    setSource(src);
    setSymbol(sym);
    setInterval(iv as Interval);
  }

  const paneData = viewData || data || [];

  return (
    <>
      <TopBar
        source={source}
        symbol={symbol}
        interval={interval}
        rightPadBars={rightPadBars}
        loading={loading}
        indicatorOpen={indOpen}
        onChangeSource={setSource}
        onChangeSymbol={setSymbol}
        onChangeInterval={setInterval}
        onChangeRightPad={setRightPadBars}
        onPreset={applyPreset}
        onLoad={() => { reload(); }}
        onToggleIndicator={() => setIndOpen(v => !v)}
      />

      <IndicatorPanel
        open={indOpen}
        showSMA={showSMA}
        showEMA={showEMA}
        showVolume={showVolume}
        showRSI={showRSI}
        showMACD={showMACD}
        onChangeSMA={setShowSMA}
        onChangeEMA={setShowEMA}
        onChangeVolume={setShowVolume}
        onChangeRSI={setShowRSI}
        onChangeMACD={setShowMACD}
        onClose={() => setIndOpen(false)}
      />

      <div ref={hostRef} className="chart-host">
        {chartRef.current && paneData && (
          <>
            <VolumePane chart={chartRef.current} data={paneData} visible={showVolume} />
            <RSIPane chart={chartRef.current} data={paneData} visible={showRSI} />
            <MACDPane chart={chartRef.current} data={paneData} visible={showMACD} />
            {candleRef.current && (
              <FibTool chart={chartRef.current} candle={candleRef.current as any} resetKey={`${source}|${symbol}|${interval}`} />
            )}
          </>
        )}
      </div>
    </>
  );
};
