export const TIMEFRAME_MAP: Record<number, string> = {
  0: 'current', 1: '1 Minute', 2: '2 Minutes', 3: '3 Minutes', 4: '4 Minutes',
  5: '5 Minutes', 6: '6 Minutes', 7: '10 Minutes', 8: '12 Minutes', 9: '15 Minutes',
  10: '20 Minutes', 11: '30 Minutes', 12: '1 Hour', 13: '2 Hours', 14: '3 Hours',
  15: '4 Hours', 16: '6 Hours', 17: '8 Hours', 18: '12 Hours', 19: '1 Day',
  20: '1 Week', 21: '1 Month'
};

export const PARAM_MAPPINGS: Record<string, Record<number, string>> = {
  InpDoYouAcceptTOS: { 0: 'NO', 1: 'YES' },
  iLotsMode: { 0: 'Static', 1: 'Dynamic (% of balance)', 2: '1 Lot per X balance' },
  iSLMode: {
    0: 'Points', 1: 'ATR', 2: 'Range size', 3: 'Previous candle + Points',
    4: 'Last swing + Points', 5: 'Last swing + ATR', 6: 'Range opposite + Points', 7: 'Range opposite + ATR'
  },
  iTPMode: { 0: 'Points', 1: 'ATR', 2: 'SL Ratio (RR)' },
  iATRTimeframe: TIMEFRAME_MAP,
  iEntryTF: TIMEFRAME_MAP,
  iTradeSession: { 0: 'Asian', 1: 'European', 2: 'London', 3: 'American', 4: 'NYSE', 5: 'Custom Range' },
  DstRegion: { 0: 'No daylight saving time', 1: 'North America', 2: 'Europe', 3: 'Oceania' },
  iEntryMode: {
    0: 'Hybrid Execution Trading', 1: 'Breakout', 2: 'Instant Breakout', 3: 'Retrace',
    4: 'Instant Retrace', 5: 'Retest range same direction', 6: 'Retest range opposite direction',
    7: 'Retest range level X', 8: 'FVG and Supply & Demand'
  },
  iNewsSource: { 0: 'MQL5.COM', 1: 'ForexFactory.com' },
  iMarkNewsOnChart: { 0: 'Do not mark', 1: 'Use a vertical line', 2: 'Create a non-trading zone' },
  iFilterHoliday: { 
    0: 'Do not filter', 1: 'Filter all', 2: 'Filter medium impact or higher', 
    3: 'Filter high impact or higher', 4: 'Filter highest impact only' 
  },
  iTSMode: { 0: 'Disabled', 1: '% TP size', 2: 'HiLo' },
  iEnableDashboard: { 0: 'Full version', 1: 'Text-only version', 2: 'Disable' }
};

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

export function getParam(file: SetFile, key: string): string | undefined {
  const line = file.lines.find(l => l.type === 'param' && l.key === key);
  return line?.value;
}

export function setParam(file: SetFile, key: string, value: string): SetFile {
  const lines = file.lines.map(l => {
    if (l.type === 'param' && l.key === key) {
      return { ...l, value, raw: `${key}=${value}` };
    }
    return l;
  });
  return { ...file, lines };
}

export function getSessionLabel(file: SetFile): string {
  const v = getParam(file, 'iTradeSession');
  if (v === undefined) return 'Unknown';
  return PARAM_MAPPINGS.iTradeSession[parseInt(v, 10)] || `Session ${v}`;
}

export function serializeSetFile(file: SetFile): string {
  return file.lines.map(l => {
    if (l.type === 'param') return `${l.key}=${l.value}`;
    return l.raw;
  }).join('\n');
}