import { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  SetFile, PARAM_MAPPINGS, getInputDef, getParamLabel,
  setParam, serializeSetFile, sanitizeValue,
  mt5ColorToHex, hexToMt5Color, mt5ColorToRgbString
} from '../types';
import inputDefs from '../../TWP_v1.11_inputs.json';

interface Props {
  files: SetFile[];
  onSave: (updated: SetFile[]) => void;
  onClose: () => void;
}

const SECTION_ICONS: Record<string, string> = {
  'Acess': '🔑',
  'Access': '🔑',
  'Trades': '📊',
  'Strategy': '🧠',
  'Filters': '🔍',
  'News': '📰',
  'Various': '⚙️',
  'Various and Grid': '⚙️',
  'Grid': '🔲',
  'Graphics': '🎨',
  'Advanced Risk Management': '🛡️',
  'Day of week': '📅',
  'Dashboard': '🖥️',
  'General': '📄',
  'Other': '❓',
};

function isBoolLike(value: string) {
  return value === 'true' || value === 'false';
}

function getSectionIcon(section: string) {
  return SECTION_ICONS[section] ?? '📄';
}

function buildParamMap(files: SetFile[]): Record<string, string> {
  const first = files[0];
  const paramMap: Record<string, string> = {};
  for (const line of first.lines) {
    if (line.type === 'param' && line.key) {
      paramMap[line.key] = line.value ?? '';
    }
  }
  for (const file of files.slice(1)) {
    for (const line of file.lines) {
      if (line.type === 'param' && line.key) {
        const v = line.value ?? '';
        if (paramMap[line.key] !== v) {
          paramMap[line.key] = '__MIXED__';
        }
      }
    }
  }
  return paramMap;
}

function applyEdits(file: SetFile, edits: Record<string, string>): SetFile {
  let updated = file;
  for (const [key, value] of Object.entries(edits)) {
    if (value === '') continue;
    updated = setParam(updated, key, value);
  }
  return updated;
}

// ── ParamField — memoized ─────────────────────────────────────────────────────
interface ParamFieldProps {
  paramKey: string;
  value: string;
  mixed: boolean;
  onChange: (key: string, value: string) => void;
}

const ParamField = memo(function ParamField({ paramKey, value, mixed, onChange }: ParamFieldProps) {
  const mapping = PARAM_MAPPINGS[paramKey];
  const def = getInputDef(paramKey);
  const label = getParamLabel(paramKey);
  const isKnownBool = def?.type === 'boolean';

  const baseInput = `w-full rounded-lg bg-[#1D2571]/40 border text-[#EFEFEF] text-sm px-3 py-1.5 focus:outline-none placeholder-[#EFEFEF]/30
    ${mixed ? 'border-amber-500/50 focus:border-amber-400' : 'border-[#1D2571]/70 focus:border-[#6F9DE7]/70'}`;

  const labelEl = (
    <label className="block text-[#7CBCC3] text-xs mb-1 truncate" title={`${label} (${paramKey})`}>
      {label}
      <span className="ml-1 opacity-40 font-mono text-[10px]">{paramKey}</span>
    </label>
  );

  if (mapping) {
    return (
      <div>
        {labelEl}
        <select
          value={mixed ? 'MIXED' : value}
          onChange={e => onChange(paramKey, e.target.value)}
          className={`${baseInput} cursor-pointer`}
          style={{ backgroundColor: '#1D2571' }}
        >
          {mixed && <option value="MIXED" disabled>— mixed —</option>}
          {Object.entries(mapping).map(([num, lbl]) => (
            <option key={num} value={num}>{lbl}</option>
          ))}
        </select>
      </div>
    );
  }

  if (def?.type === 'color') {
    const hexValue = value ? mt5ColorToHex(value) : '#000000';
    const rgbDisplay = value ? mt5ColorToRgbString(value) : '0,0,0';
    return (
      <div>
        {labelEl}
        <div className={`flex items-center gap-2 rounded-lg bg-[#1D2571]/40 border px-3 py-1.5 ${mixed ? 'border-amber-500/50' : 'border-[#1D2571]/70'}`}>
          <input
            type="color"
            value={mixed ? '#000000' : hexValue}
            onChange={e => onChange(paramKey, hexToMt5Color(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border border-[#1D2571]/60 bg-transparent p-0"
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[#EFEFEF] text-sm font-mono">{mixed ? '— mixed —' : rgbDisplay}</span>
            <span className="text-[#7CBCC3]/40 text-[10px] font-mono">{mixed ? '' : hexValue}</span>
          </div>
          {!mixed && (
            <div className="w-6 h-6 rounded border border-white/20 flex-shrink-0" style={{ backgroundColor: hexValue }} />
          )}
        </div>
      </div>
    );
  }

  const effectivelyBool = isKnownBool || (!mixed && isBoolLike(value));
  if (effectivelyBool && !mixed && value !== '') {
    const checked = value === 'true';
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#1D2571]/30 border border-[#1D2571]/60 px-3 py-2">
        <div className="flex flex-col flex-1 mr-2 min-w-0">
          <span className="text-[#7CBCC3] text-xs truncate">{label}</span>
          <span className="text-[#7CBCC3]/40 font-mono text-[10px] truncate">{paramKey}</span>
        </div>
        <button
          onClick={() => onChange(paramKey, checked ? 'false' : 'true')}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2
            ${checked ? 'bg-[#6F9DE7] border-[#6F9DE7]' : 'bg-[#1D2571]/60 border-[#1D2571]'}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
    );
  }

  if (isKnownBool || (mixed && /^i(Trade|Filter|Use|Mark|Close|Enable|Fill|Draw|Open|Partial)/i.test(paramKey))) {
    return (
      <div className={`flex items-center justify-between rounded-lg bg-[#1D2571]/30 border px-3 py-2
        ${mixed ? 'border-amber-500/40' : 'border-[#1D2571]/60'}`}>
        <div className="flex flex-col flex-1 mr-2 min-w-0">
          <span className="text-[#7CBCC3] text-xs truncate">{label}</span>
          <span className="text-[#7CBCC3]/40 font-mono text-[10px] truncate">{paramKey}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onChange(paramKey, 'true')} className="px-2 py-0.5 rounded text-xs bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/40 border border-[#6F9DE7]/30 text-[#6F9DE7]">true</button>
          <button onClick={() => onChange(paramKey, 'false')} className="px-2 py-0.5 rounded text-xs bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 text-rose-300">false</button>
        </div>
      </div>
    );
  }

  if (def?.type === 'integer') {
    return (
      <div>
        {labelEl}
        <input type="number" step="1" value={mixed ? '' : value} placeholder={mixed ? '— mixed —' : ''}
          onChange={e => onChange(paramKey, sanitizeValue(paramKey, e.target.value))} className={baseInput} />
      </div>
    );
  }

  if (def?.type === 'float') {
    return (
      <div>
        {labelEl}
        <input type="number" step="any" value={mixed ? '' : value} placeholder={mixed ? '— mixed —' : ''}
          onChange={e => onChange(paramKey, sanitizeValue(paramKey, e.target.value))} className={baseInput} />
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <input type="text" value={mixed ? '' : (value === '-' ? '' : value)} placeholder={mixed ? '— mixed —' : ''}
        onChange={e => { const val = e.target.value; onChange(paramKey, val === '' ? '-' : val); }} className={baseInput} />
    </div>
  );
});

// ── LazySection ───────────────────────────────────────────────────────────────
interface LazySectionProps {
  sectionName: string;
  params: { key: string; value: string }[];
  getValue: (key: string) => string;
  isMixed: (key: string) => boolean;
  onChange: (key: string, value: string) => void;
  forceVisible?: boolean;
}

const LazySection = memo(function LazySection({
  sectionName, params, getValue, isMixed, onChange, forceVisible = false
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenSeen, setHasBeenSeen] = useState(forceVisible);
  const [collapsed, setCollapsed] = useState(sectionName === 'Other');

  useEffect(() => {
    if (forceVisible) { setHasBeenSeen(true); return; }
    if (hasBeenSeen) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasBeenSeen(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [forceVisible, hasBeenSeen]);

  const estimatedHeight = Math.ceil(params.length / 2) * 72 + 48;
  const isOther = sectionName === 'Other';
  const count = params.length;
  const isSingular = count === 1;

  return (
    <div ref={ref} id={`section-${sectionName}`} className="scroll-mt-6">
      <h3
        className={`text-[#7CBCC3] text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2
          ${isOther ? 'cursor-pointer hover:text-[#7CBCC3]/80 select-none' : ''}`}
        onClick={isOther ? () => setCollapsed(prev => !prev) : undefined}
      >
        <span className="text-base">{getSectionIcon(sectionName)}</span>
        {sectionName}
        {isOther && (
          <>
            <span className="text-[10px] font-normal normal-case tracking-normal text-[#7CBCC3]/50 ml-1">
              ({count})
            </span>
            <svg
              className={`w-3.5 h-3.5 ml-auto transition-transform ${collapsed ? '' : 'rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </h3>

      {isOther && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 text-[#7CBCC3]/40 text-xs hover:text-[#7CBCC3]/70 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Show {count} hidden {isSingular ? 'input' : 'inputs'}
        </button>
      )}

      {isOther && !collapsed && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <span className="text-amber-400 text-sm mt-0.5 flex-shrink-0">⚠</span>
          <p className="text-[#7CBCC3]/60 text-xs leading-relaxed">
            {isSingular ? 'This input doesn\'t' : 'These inputs don\'t'} appear
            in the official TWP EA Robot, v1.11. Most likely{' '}
            {isSingular ? 'an obsolete remnant setting' : 'obsolete remnant settings'}.
          </p>
        </div>
      )}

      {!collapsed && (
        hasBeenSeen ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {params.map(p => (
              <ParamField key={p.key} paramKey={p.key} value={getValue(p.key)} mixed={isMixed(p.key)} onChange={onChange} />
            ))}
          </div>
        ) : (
          <div style={{ height: estimatedHeight }} className="rounded-lg bg-[#1D2571]/10 animate-pulse" />
        )
      )}
    </div>
  );
});

// ── Scroll-spy hook — uses scroll events instead of IntersectionObserver ──────
function useScrollSpy(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sectionIds: string[],
  enabled: boolean
): string {
  const [active, setActive] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || sectionIds.length === 0) return;

    let rafId: number;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        // The "anchor line" — a point below the top of the container
        // to account for the header. 72px ≈ header height + some padding.
        const anchorY = containerRect.top + 72;

        // Check if we're scrolled to the very bottom
        const isAtBottom = Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight
        ) < 2;

        if (isAtBottom) {
          // Highlight the last section
          setActive(sectionIds[sectionIds.length - 1]);
          return;
        }

        // Find the section whose top is closest to (but above) the anchor line
        let bestId = sectionIds[0];
        let bestDistance = Infinity;

        for (const id of sectionIds) {
          const el = document.getElementById(`section-${id}`);
          if (!el) continue;

          const elRect = el.getBoundingClientRect();
          const distance = anchorY - elRect.top;

          // We want sections that have scrolled past or are at the anchor (distance >= 0)
          // and pick the one that passed most recently (smallest positive distance)
          if (distance >= -10 && distance < bestDistance) {
            bestDistance = distance;
            bestId = id;
          }
        }

        setActive(bestId);
      });
    };

    // Run once immediately to set initial state
    onScroll();

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, sectionIds, enabled]);

  return active;
}

// ── EditorModal ───────────────────────────────────────────────────────────────
export default function EditorModal({ files, onSave, onClose }: Props) {
  const isMulti = files.length > 1;
  const [searchQuery, setSearchQuery] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const originalParamMap = useMemo(() => buildParamMap(files), [files]);

  const sections = useMemo(() => {
    const result: Record<string, { key: string; value: string }[]> = {};
    for (const [sectionName, defs] of Object.entries(inputDefs as Record<string, { var: string }[]>)) {
      result[sectionName] = defs.map(d => ({
        key: d.var,
        value: originalParamMap[d.var] ?? '',
      }));
    }
    const knownVars = new Set(
      Object.values(inputDefs as Record<string, { var: string }[]>).flat().map(d => d.var)
    );
    const unknownParams: { key: string; value: string }[] = [];
    for (const key of Object.keys(originalParamMap)) {
      if (!knownVars.has(key)) {
        unknownParams.push({ key, value: originalParamMap[key] ?? '' });
      }
    }
    if (unknownParams.length > 0) result['Other'] = unknownParams;
    return result;
  }, [originalParamMap]);

  const sectionNames = Object.keys(sections);
  const isSearching = searchQuery.trim().length > 0;

  // Scroll spy — only active when not searching
  const activeSection = useScrollSpy(scrollContainerRef, sectionNames, !isSearching);

  const getValue = useCallback((key: string): string => {
    if (edits[key] !== undefined) return edits[key];
    return originalParamMap[key] === '__MIXED__' ? '' : (originalParamMap[key] ?? '');
  }, [edits, originalParamMap]);

  const isMixed = useCallback((key: string): boolean => {
    return edits[key] === undefined && originalParamMap[key] === '__MIXED__';
  }, [edits, originalParamMap]);

  const handleChange = useCallback((key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    const updated = files.map(f => applyEdits(f, edits));
    onSave(updated);
  };

  const handleDownload = () => {
    const updated = files.map(f => applyEdits(f, edits));
    for (const file of updated) {
      const blob = new Blob([serializeSetFile(file)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filteredSections = useMemo(() => {
    if (!isSearching) return sections;
    const q = searchQuery.toLowerCase();
    const result: typeof sections = {};
    for (const [sec, params] of Object.entries(sections)) {
      const filtered = params.filter(p =>
        p.key.toLowerCase().includes(q) ||
        p.value.toLowerCase().includes(q) ||
        getParamLabel(p.key).toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[sec] = filtered;
    }
    return result;
  }, [sections, searchQuery, isSearching]);

  const displaySections = isSearching ? Object.keys(filteredSections) : sectionNames;

  const scrollToSection = (sec: string) => {
    const element = document.getElementById(`section-${sec}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl border border-[#1D2571] bg-[#0d1240] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D2571]/80 bg-[#1D2571]/40 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6F9DE7]/20 border border-[#6F9DE7]/30 flex-shrink-0">
              <svg className="w-4 h-4 text-[#6F9DE7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-[#EFEFEF] font-bold text-base leading-tight truncate">
                {isMulti ? `Editing ${files.length} files` : files[0].filename}
              </h2>
              {isMulti && (
                <p className="text-[#7CBCC3] text-xs mt-0.5 truncate">{files.map(f => f.filename).join(', ')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7CBCC3]/15 hover:bg-[#7CBCC3]/25 border border-[#7CBCC3]/30 text-[#7CBCC3] text-xs font-semibold transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/35 border border-[#6F9DE7]/40 text-[#6F9DE7] text-xs font-semibold transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Save Changes
            </button>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-[#EFEFEF]/60 hover:text-[#EFEFEF] transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-[#1D2571]/60 bg-[#0d1240]/80 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#1D2571]/60">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7CBCC3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search params..."
                  className="w-full rounded-lg bg-[#1D2571]/30 border border-[#1D2571]/60 text-[#EFEFEF] placeholder-[#7CBCC3]/50 text-xs pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#6F9DE7]/60"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {displaySections.map(sec => (
                <button
                  key={sec}
                  onClick={() => scrollToSection(sec)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium
                    ${activeSection === sec && !isSearching
                      ? 'bg-[#1D2680]/60 text-[#6F9DE7] border-r-2 border-[#6F9DE7]'
                      : 'text-[#EFEFEF]/70 hover:bg-[#1D2571]/40 hover:text-[#EFEFEF]'
                    }`}
                >
                  <span className="text-sm">{getSectionIcon(sec)}</span>
                  <span className="truncate">{sec}</span>
                  <span className="ml-auto text-[10px] opacity-50">
                    {(isSearching ? filteredSections[sec] : sections[sec])?.length ?? 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Form */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
            {displaySections.length === 0 ? (
              <p className="text-center text-[#7CBCC3]/60 text-sm mt-10">No parameters match your search.</p>
            ) : (
              <div className="flex flex-col gap-8 pb-32">
                {displaySections.map(sec => (
                  <LazySection
                    key={sec}
                    sectionName={sec}
                    params={isSearching ? (filteredSections[sec] ?? []) : (sections[sec] ?? [])}
                    getValue={getValue}
                    isMixed={isMixed}
                    onChange={handleChange}
                    forceVisible={isSearching}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Multi-edit footer */}
        {isMulti && (
          <div className="flex items-center px-6 py-2 border-t border-[#1D2571]/60 bg-[#1D2571]/20 flex-shrink-0">
            <p className="text-[#7CBCC3] text-xs">
              <span className="text-amber-400 font-semibold">⚠ Multi-edit mode</span>
              {' '}— Fields shown as <span className="italic text-amber-300">"— mixed —"</span> differ across files. Any value you set will apply to <strong className="text-[#EFEFEF]">all</strong> selected files.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}