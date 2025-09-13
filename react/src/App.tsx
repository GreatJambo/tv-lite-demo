import React from 'react';
import { ChartContainer } from './chart/ChartContainer';
import { DebugOverlay } from './ui/DebugOverlay';

export default function App() {
  return (
    <div className="app-root">
      <div className="header">TV‑lite React（步骤 1–7 完成：容器/主图/数据/Pane/UI/WS/Fib）</div>
      <div className="content">
        <ChartContainer />
      </div>
      <DebugOverlay />
    </div>
  );
}
