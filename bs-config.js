const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { URL } = require('url');
const https = require('https');
const http = require('http');

// Node 18+ has global fetch; fallback if not
let fetchFn = global.fetch;
if (!fetchFn) {
  try { fetchFn = require('node-fetch'); } catch (_) { /* ignore */ }
}

const CACHE_DIR = path.join(__dirname, '.cache');
const TTL_MS = 5 * 60 * 1000; // 5 minutes

async function ensureDir(p) { await fsp.mkdir(p, { recursive: true }).catch(() => {}); }
async function readCache(key) {
  try {
    const fp = path.join(CACHE_DIR, key + '.json');
    const stat = await fsp.stat(fp);
    if (Date.now() - stat.mtimeMs < TTL_MS) {
      const buf = await fsp.readFile(fp, 'utf8');
      return JSON.parse(buf);
    }
  } catch (_) {}
  return null;
}
async function writeCache(key, data) {
  try { await ensureDir(CACHE_DIR); await fsp.writeFile(path.join(CACHE_DIR, key + '.json'), JSON.stringify(data)); } catch (_) {}
}

function sendJson(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function httpFetch(urlStr, opts = {}) {
  if (fetchFn) return fetchFn(urlStr, { ...opts, agent: (parsedUrl) => (parsedUrl.protocol === 'http:' ? new http.Agent({ keepAlive: true }) : new https.Agent({ keepAlive: true })) });
  // minimal fallback
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request(urlStr, { method: opts.method || 'GET', headers: opts.headers }, (r) => {
      let data = '';
      r.on('data', (c) => (data += c));
      r.on('end', () => resolve({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, json: async () => JSON.parse(data) }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function toBars(arr) {
  // Normalized OHLCV bars: { time: seconds, open, high, low, close, volume }
  return arr.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 }));
}

async function fetchBinance(symbol, interval, limit = 800) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  const res = await httpFetch(url);
  if (!res.ok) throw new Error('Binance API ' + res.status);
  const data = await res.json();
  const bars = data.map(r => ({ time: Math.floor(r[0] / 1000), open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] }));
  return toBars(bars);
}

const yahooIntervalMap = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '60m', '4h': '60m', '1d': '1d' };
const yahooRangeMap = { '1m': '1d', '5m': '5d', '15m': '1mo', '1h': '3mo', '4h': '6mo', '1d': '2y' };
async function fetchYahoo(symbol, interval) {
  const iv = yahooIntervalMap[interval] || '1d';
  const range = yahooRangeMap[interval] || '1y';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${iv}&range=${range}`;
  const res = await httpFetch(url, { headers: { 'User-Agent': 'tv-lite-demo' } });
  if (!res.ok) throw new Error('Yahoo API ' + res.status);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error('Yahoo chart empty');
  const ts = r.timestamp || [];
  const q = r.indicators?.quote?.[0] || {};
  const out = ts.map((t, i) => ({ time: t, open: +q.open[i], high: +q.high[i], low: +q.low[i], close: +q.close[i], volume: +q.volume[i] }));
  return toBars(out.filter(b => Number.isFinite(b.close)));
}

const polygonUnitMap = { '1m': 'minute', '5m': 'minute', '15m': 'minute', '1h': 'hour', '4h': 'hour', '1d': 'day' };
function polygonMultiplier(interval) { if (interval === '5m') return 5; if (interval === '15m') return 15; if (interval === '4h') return 4; return 1; }
async function fetchPolygon(symbol, interval) {
  const key = process.env.POLYGON_API_KEY || '';
  if (!key) throw new Error('Missing POLYGON_API_KEY');
  const unit = polygonUnitMap[interval] || 'day';
  const mult = polygonMultiplier(interval);
  const end = new Date(); const start = new Date(); start.setFullYear(end.getFullYear() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${mult}/${unit}/${fmt(start)}/${fmt(end)}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;
  const res = await httpFetch(url);
  if (!res.ok) throw new Error('Polygon API ' + res.status);
  const json = await res.json();
  const results = json.results || [];
  const bars = results.map(r => ({ time: Math.floor(r.t / 1000), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v }));
  return toBars(bars);
}

async function fetchTwelveData(symbol, interval) {
  const key = process.env.TWELVEDATA_API_KEY || '';
  if (!key) throw new Error('Missing TWELVEDATA_API_KEY');
  const map = { '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day' };
  const iv = map[interval] || '1day';
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${iv}&outputsize=5000&apikey=${key}`;
  const res = await httpFetch(url);
  if (!res.ok) throw new Error('TwelveData API ' + res.status);
  const json = await res.json();
  const values = json.values || [];
  const bars = values.map(v => ({ time: Math.floor(new Date(v.datetime).getTime()/1000), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(+v.volume || 0) })).reverse();
  return toBars(bars);
}

async function handleKlines(req, res) {
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const source = (urlObj.searchParams.get('source') || 'binance').toLowerCase();
    const symbol = urlObj.searchParams.get('symbol') || 'BTCUSDT';
    const interval = urlObj.searchParams.get('interval') || '1d';
    const limit = +(urlObj.searchParams.get('limit') || '800');
    const cacheKey = [source, symbol, interval, limit].join('_');
    const cached = await readCache(cacheKey);
    if (cached) return sendJson(res, cached);
    let data;
    if (source === 'binance') data = await fetchBinance(symbol, interval, limit);
    else if (source === 'yahoo') data = await fetchYahoo(symbol, interval);
    else if (source === 'polygon') data = await fetchPolygon(symbol, interval);
    else if (source === 'twelvedata') data = await fetchTwelveData(symbol, interval);
    else throw new Error('Unknown source');
    await writeCache(cacheKey, data);
    return sendJson(res, data);
  } catch (e) {
    return sendJson(res, { error: e.message || String(e) }, 500);
  }
}

module.exports = {
  host: '0.0.0.0',
  port: 3000,
  open: false,
  ui: false,
  server: {
    baseDir: ['./'],
    middleware: [
      function apiMiddleware(req, res, next) {
        if (req.url.startsWith('/api/klines')) {
          // run async and swallow next
          handleKlines(req, res);
          return;
        }
        next();
      },
    ],
  },
};
