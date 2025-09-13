# TV‑lite Demo (Lightweight Charts + React)

A minimal, fast charting demo built on TradingView's Lightweight Charts. The repo contains:

- A plain HTML prototype (`index.html`) showing the full feature set without a framework
- A React implementation under `react/` with the same look and feel
- A tiny Node proxy server (`server.js`) to fetch OHLCV data from multiple providers

Use it as a starting point for lightweight charting apps or as a reference for
migrating to React with v5 of Lightweight Charts.

## Features

- Candlestick chart with close price line
- Moving averages: SMA(20) and EMA(50), toggle visibility
- Indicator panes: Volume, RSI(14), MACD(12,26,9) with automatic pane sizing
- Top bar controls: data source, symbol, presets, interval, load button, right offset (right padding)
- Fibonacci retracement tool (two‑point): extend toggle, clear, and axis price labels
- Realtime streaming via Binance WebSocket (when source is `binance`)
- Range handling: sensible initial window per interval, preserve/restore visible logical range, clamp right edge
- Debug overlay (`?debug=1`) capturing errors and rejections

## Requirements

- Node.js 18+ (uses global `fetch`) and npm

## Quick Start

1) Install dependencies

```
npm install
```

2) Start the proxy + static server (port 3000)

```
npm start
```

3) Start the React dev server (port 5173)

```
npm run dev
```

- Open `http://localhost:5173` (or your Tailscale/MagicDNS host if you use Tailscale).
- The Vite config proxies `/api/*` to `http://localhost:3000`.

Tip: If you need to access from another device on the same tailnet, the dev server is already configured with `server.host: true`. Visit `http://<tailscale-ip>:5173`.

## Data Sources

The proxy endpoint is `/api/klines` with a unified OHLCV format:

```
/api/klines?source=<binance|binanceus|yahoo|polygon|twelvedata|auto>&symbol=<SYMBOL>&interval=<1m|5m|15m|1h|4h|1d>&limit=800
```

- `auto`: tries several crypto‑friendly providers in order.
- `yahoo`: common crypto pairs are mapped (e.g., `BTCUSDT` → `BTC-USD`).
- `polygon` and `twelvedata` require API keys via env vars: `POLYGON_API_KEY`, `TWELVEDATA_API_KEY`.

When the source is `binance`, the React app also opens a WebSocket stream to update/append the latest bar in realtime.

## React App Usage

- Source, Symbol, Interval, Presets: top bar controls (click “加载” to refetch)
- Right Offset: controls right padding (in bars) and clamps right scroll
- Indicators panel: toggle SMA, EMA, Volume, RSI, MACD
- Fibonacci tool: use the left toolbar
  - Click “Fib” to arm, then click two points on the chart to place A and B
  - “⇔” toggles full‑width extension of price lines
  - “✕” clears all Fib levels and markers

## Build & Preview

Build the React app for production and preview locally:

```
npm run build:react
npm run preview:react
```

The static output is written to `react/dist/`. You can deploy it to any static host,
or adapt `server.js` to serve that directory if you prefer a single server.

## Project Layout

- `index.html` – framework‑free prototype (UMD build)
- `server.js` – small Node server and `/api/klines` proxy
- `react/` – Vite + React app (ESM build)
  - `src/chart/ChartContainer.tsx` – chart lifecycle, series, ranges, WS
  - `src/hooks/` – `useKlines` (REST), `useBinanceWS` (realtime)
  - `src/panes/` – `VolumePane`, `RSIPane`, `MACDPane`
  - `src/tools/` – `FibTool` (two‑point retracement)
  - `src/ui/` – `TopBar`, `IndicatorPanel`, `DebugOverlay`

## Troubleshooting

- Nothing shows on the chart: open `/?debug=1` to see error logs. Ensure `npm start` is running and that `/api/klines` responds.
- Cross‑device access: if using Tailscale, use the Tailscale IP/hostname on port 5173. Otherwise, use SSH port‑forwarding: `ssh -N -L 5173:127.0.0.1:5173 user@host`.
- Public exposure: Vite dev server is not meant for the public internet. Use it inside a trusted network or build and serve static files.

## License & Attribution

- This project uses TradingView Lightweight Charts (Apache 2.0). Follow the attribution requirements from the library:
  - Add the attribution notice from the library `NOTICE` and a link to https://www.tradingview.com/ in a public page of your app.
  - Optionally display the in‑chart attribution via the `attributionLogo` chart option.

---

Happy charting!
