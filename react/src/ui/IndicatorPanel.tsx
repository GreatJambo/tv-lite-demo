import React, { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  showSMA: boolean;
  showEMA: boolean;
  showVolume: boolean;
  showRSI: boolean;
  showMACD: boolean;
  onChangeSMA: (v: boolean) => void;
  onChangeEMA: (v: boolean) => void;
  onChangeVolume: (v: boolean) => void;
  onChangeRSI: (v: boolean) => void;
  onChangeMACD: (v: boolean) => void;
  onClose: () => void;
}

export const IndicatorPanel: React.FC<Props> = (props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!props.open) return;
      const el = ref.current;
      if (!el) return;
      const target = ev.target as Element | null;
      if (el.contains(target as any)) return;
      if (target && (target.closest('[data-role="ind-toggle"]'))) return;
      props.onClose();
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [props.open]);

  return (
    <div ref={ref} className="panel" style={{ display: props.open ? 'block' : 'none' }}>
      <label><input type="checkbox" checked={props.showSMA} onChange={e => props.onChangeSMA(e.target.checked)} /> <span style={{ color: 'orange' }}>SMA20</span></label>
      <label><input type="checkbox" checked={props.showEMA} onChange={e => props.onChangeEMA(e.target.checked)} /> <span style={{ color: 'cyan' }}>EMA50</span></label>
      <label><input type="checkbox" checked={props.showVolume} onChange={e => props.onChangeVolume(e.target.checked)} /> <span>Volume</span></label>
      <hr style={{ border: 'none', borderTop: '1px solid #475569', margin: '6px 0' }} />
      <label><input type="checkbox" checked={props.showRSI} onChange={e => props.onChangeRSI(e.target.checked)} /> <span>RSI(14)</span></label>
      <label><input type="checkbox" checked={props.showMACD} onChange={e => props.onChangeMACD(e.target.checked)} /> <span>MACD(12,26,9)</span></label>
    </div>
  );
};
