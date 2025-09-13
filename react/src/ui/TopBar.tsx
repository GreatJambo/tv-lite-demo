import React from 'react';

export type Source = 'auto' | 'binance' | 'binanceus' | 'yahoo' | 'polygon' | 'twelvedata';
export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface Props {
  source: Source;
  symbol: string;
  interval: Interval;
  rightPadBars: number;
  loading?: boolean;
  indicatorOpen: boolean;
  onChangeSource: (v: Source) => void;
  onChangeSymbol: (v: string) => void;
  onChangeInterval: (v: Interval) => void;
  onChangeRightPad: (v: number) => void;
  onPreset: (preset: string) => void;
  onLoad: () => void;
  onToggleIndicator: () => void;
}

export const TopBar: React.FC<Props> = (props) => {
  return (
    <div className="topbar">
      <label style={{ opacity: .75, marginRight: 4 }}>源</label>
      <select className="top-select" value={props.source}
              onChange={e => props.onChangeSource(e.target.value as Source)}>
        <option value="auto">Auto</option>
        <option value="binance">Binance</option>
        <option value="binanceus">Binance US</option>
        <option value="yahoo">Yahoo</option>
        <option value="polygon">Polygon</option>
        <option value="twelvedata">TwelveData</option>
      </select>

      <label style={{ opacity: .75, marginLeft: 8, marginRight: 4 }}>交易对/代码</label>
      <input className="top-input" style={{ width: 120 }} value={props.symbol}
             onChange={e => props.onChangeSymbol(e.target.value.toUpperCase())} />

      <select className="top-select" defaultValue="" onChange={e => props.onPreset(e.target.value)}>
        <option value="">预设</option>
        <option value="BINANCE:BTCUSDT|1d">BTCUSDT 1d</option>
        <option value="BINANCE:ETHUSDT|1h">ETHUSDT 1h</option>
        <option value="YF:AAPL|1d">AAPL 1d</option>
        <option value="YF:TSLA|1d">TSLA 1d</option>
      </select>

      <select className="top-select" value={props.interval}
              onChange={e => props.onChangeInterval(e.target.value as Interval)}>
        <option value="1d">1d</option>
        <option value="4h">4h</option>
        <option value="1h">1h</option>
        <option value="15m">15m</option>
        <option value="5m">5m</option>
        <option value="1m">1m</option>
      </select>

      <button className="top-btn" onClick={props.onLoad} disabled={props.loading}>
        {props.loading ? '加载中…' : '加载'}
      </button>

      <label style={{ opacity: .75, marginLeft: 8, marginRight: 4 }}>右侧留白</label>
      <input className="top-input" type="number" min={0} max={50} style={{ width: 56 }}
             value={props.rightPadBars}
             onChange={e => props.onChangeRightPad(Math.max(0, Math.min(50, Number(e.target.value || 0))))} />

      <button className="top-btn" data-role="ind-toggle" onClick={props.onToggleIndicator}>
        指标{props.indicatorOpen ? '▲' : '▼'}
      </button>
    </div>
  );
};
