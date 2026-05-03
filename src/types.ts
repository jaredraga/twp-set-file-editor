// ─── Import the JSON mapping directly (Vite resolves this at build time) ──────
import inputDefs from '../TWP_v1.11_inputs.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InputDef {
  var: string;
  label: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'enum' | 'color';
  options?: string[];
}

// ─── Derive flat map from JSON (all sections combined) ────────────────────────

const ALL_DEFS: InputDef[] = Object.values(inputDefs).flat() as InputDef[];

export const INPUT_DEF_MAP: Record<string, InputDef> = Object.fromEntries(
  ALL_DEFS.map(d => [d.var, d])
);

export function getParamLabel(key: string): string {
  return INPUT_DEF_MAP[key]?.label ?? key;
}

export function getInputDef(key: string): InputDef | undefined {
  return INPUT_DEF_MAP[key];
}

// ─── PARAM_MAPPINGS — derived from JSON enums + extras not in JSON ────────────

function optionsToMap(def?: InputDef): Record<number, string> | undefined {
  if (!def?.options) return undefined;
  return Object.fromEntries(def.options.map((label, idx) => [idx, label]));
}

// ─── MT5 BGR Color Helpers ────────────────────────────────────────────────────

/** Convert MT5 packed BGR integer (e.g. "2036737") to hex string (e.g. "#01141f") */
export function mt5ColorToHex(packed: string): string {
  const n = parseInt(packed, 10);
  if (isNaN(n) || n < 0) return '#000000';
  const r = n & 0xFF;
  const g = (n >> 8) & 0xFF;
  const b = (n >> 16) & 0xFF;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Convert hex string (e.g. "#01141f") to MT5 packed BGR integer string (e.g. "2036737") */
export function hexToMt5Color(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return String((b << 16) | (g << 8) | r);
}

/** Convert MT5 packed BGR integer to "R,G,B" display string */
export function mt5ColorToRgbString(packed: string): string {
  const n = parseInt(packed, 10);
  if (isNaN(n) || n < 0) return '0,0,0';
  const r = n & 0xFF;
  const g = (n >> 8) & 0xFF;
  const b = (n >> 16) & 0xFF;
  return `${r},${g},${b}`;
}

// The 21 exact valid states for MQL5 ENUM_TIMEFRAMES
const TIMEFRAME_ENUM_VALUES: Record<number, string> = {
  0: 'current',
  1: '1 Minute',
  2: '2 Minutes',
  3: '3 Minutes',
  4: '4 Minutes',
  5: '5 Minutes',
  6: '6 Minutes',
  10: '10 Minutes',
  12: '12 Minutes',
  15: '15 Minutes',
  20: '20 Minutes',
  30: '30 Minutes',
  16385: '1 Hour',
  16386: '2 Hours',
  16387: '3 Hours',
  16388: '4 Hours',
  16390: '6 Hours',
  16392: '8 Hours',
  16396: '12 Hours',
  16408: '1 Day',
  32769: '1 Week',
  49153: '1 Month'
};

export const PARAM_MAPPINGS: Record<string, Record<number, string>> = {
  // Derived directly from the JSON enum fields
  ...Object.fromEntries(
    ALL_DEFS
      .filter(d => d.type === 'enum' && d.options)
      .map(d => [d.var, optionsToMap(d)!])
  ),
  // MT5 quirk: The visual list is ["YES","NO"], but it actually saves to the .set file as 0=NO, 1=YES.
  InpDoYouAcceptTOS: { 0: 'NO', 1: 'YES' },

  // Override timeframe parameters with correct MQL5 enum values
  // Another quirk: MT5's timeframe enum values are not sequential indices - 
  // they jump to specific constants starting at "1 Hour" (16385)
  iATRTimeframe: TIMEFRAME_ENUM_VALUES,
  iEntryTF: TIMEFRAME_ENUM_VALUES,
};

// ─── Core types ───────────────────────────────────────────────────────────────

export interface SetLine {
  type: 'comment' | 'separator' | 'param' | 'blank';
  raw: string;
  key?: string;
  value?: string;
}

export interface SetFile {
  id: string;
  filename: string;
  lines: SetLine[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a raw value that may contain || separators (e.g. "100592001||34232||1||342320||N").
 * Only the FIRST segment is kept; the rest are optimizer metadata.
 */
export function extractFirstValue(raw: string): string {
  if (raw.includes('||')) {
    return raw.split('||')[0];
  }
  return raw;
}

export function getParam(file: SetFile, key: string): string | undefined {
  const line = file.lines.find(l => l.type === 'param' && l.key === key);
  if (line?.value === undefined) return undefined;
  return extractFirstValue(line.value);
}

export function setParam(file: SetFile, key: string, value: string): SetFile {
  const lines = file.lines.map(l => {
    if (l.type === 'param' && l.key === key) {
      return { ...l, value, raw: `${key}=${value}` };
    }
    return l;
  });
  if (!lines.some(l => l.type === 'param' && l.key === key)) {
    lines.push({ type: 'param', raw: `${key}=${value}`, key, value });
  }
  return { ...file, lines };
}

export function getSessionLabel(file: SetFile): string {
  const v = getParam(file, 'iTradeSession');
  if (v === undefined) return 'Unknown';
  return PARAM_MAPPINGS.iTradeSession?.[parseInt(v, 10)] ?? `Session ${v}`;
}

export function serializeSetFile(file: SetFile): string {
  return file.lines.map(l => {
    if (l.type === 'param') return `${l.key}=${l.value}`;
    return l.raw;
  }).join('\n');
}

export function sanitizeValue(key: string, raw: string): string {
  const def = getInputDef(key);
  if (!def) return raw;
  switch (def.type) {
    case 'integer': {
      const n = parseInt(raw, 10);
      return isNaN(n) ? raw : String(n);
    }
    case 'float': {
      const f = parseFloat(raw);
      return isNaN(f) ? raw : String(f);
    }
    case 'boolean':
      return raw === 'true' || raw === '1' ? 'true' : 'false';
    default:
      return raw;
  }
}