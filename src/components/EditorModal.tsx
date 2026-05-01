import { useMemo, useState } from 'react';
import { SetFile, PARAM_MAPPINGS, setParam, serializeSetFile } from '../types';
import { groupParams } from '../parser';

interface Props {
  files: SetFile[];
  onSave: (updated: SetFile[]) => void;
  onClose: () => void;
}

const SECTION_ICONS: Record<string, string> = {
  'Acess': '🔑',
  'Trades': '📊',
  'Strategy': '🧠',
  'Filters': '🔍',
  'News': '📰',
  'Various': '⚙️',
  'Grid': '🔲',
  'Graphics': '🎨',
  'Advanced Risk Management': '🛡️',
  'Day of week': '📅',
  'Dashboard': '🖥️',
  'General': '📄',
};

const BOOL_KEYS_PATTERN = /^i(Trade|Filter|Use|Mark|Close|Enable|Fill|Draw|Open|Partial)/i;

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
    updated = setParam(updated, key, value);
  }
  return updated;
}

// ──────────────────────────────────────────────
// ParamField
// ──────────────────────────────────────────────
interface ParamFieldProps {
  paramKey: string;
  value: string;
  mixed: boolean;
  onChange: (key: string, value: string) => void;
}

function ParamField({ paramKey, value, mixed, onChange }: ParamFieldProps) {
  const mapping = PARAM_MAPPINGS[paramKey];

  const baseInput = `w-full rounded-lg bg-[#1D2571]/40 border text-[#EFEFEF] text-sm px-3 py-1.5 focus:outline-none transition-all placeholder-[#EFEFEF]/30
    ${mixed ? 'border-amber-500/50 focus:border-amber-400' : 'border-[#1D2571]/70 focus:border-[#6F9DE7]/70'}`;

  const label = (
    <label className="block text-[#7CBCC3] text-xs font-mono mb-1 truncate" title={paramKey}>
      {paramKey}
    </label>
  );

  // 1. Check for defined Mappings (Dropdowns)
  if (mapping) {
    return (
      <div>
        {label}
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

  // 2. Check for Booleans (Toggles)
  if (!mixed && isBoolLike(value)) {
    const checked = value === 'true';
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#1D2571]/30 border border-[#1D2571]/60 px-3 py-2">
        <label className="text-[#7CBCC3] text-xs font-mono truncate flex-1 mr-2" title={paramKey}>{paramKey}</label>
        <button
          onClick={() => onChange(paramKey, checked ? 'false' : 'true')}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 transition-all
            ${checked ? 'bg-[#6F9DE7] border-[#6F9DE7]' : 'bg-[#1D2571]/60 border-[#1D2571]'}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
    );
  }

  // Mixed bool — show explicit buttons
  if (mixed && BOOL_KEYS_PATTERN.test(paramKey)) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#1D2571]/30 border border-amber-500/40 px-3 py-2">
        <label className="text-[#7CBCC3] text-xs font-mono truncate flex-1 mr-2" title={paramKey}>{paramKey}</label>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onChange(paramKey, 'true')}
            className="px-2 py-0.5 rounded text-xs bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/40 border border-[#6F9DE7]/30 text-[#6F9DE7] transition-all"
          >true</button>
          <button
            onClick={() => onChange(paramKey, 'false')}
            className="px-2 py-0.5 rounded text-xs bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 text-rose-300 transition-all"
          >false</button>
        </div>
      </div>
    );
  }

  // 3. Default (Text Input)
  return (
    <div>
      {label}
      <input
        type="text"
        value={mixed ? '' : value}
        placeholder={mixed ? '— mixed —' : ''}
        onChange={e => onChange(paramKey, e.target.value)}
        className={baseInput}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// EditorModal
// ──────────────────────────────────────────────
export default function EditorModal({ files, onSave, onClose }: Props) {
  const isMulti = files.length > 1;
  const [activeSection, setActiveSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const originalParamMap = useMemo(() => buildParamMap(files), [files]);

  const sections = useMemo(() => groupParams(files[0].lines), [files]);
  const sectionNames = Object.keys(sections);

  const resolvedActiveSection = activeSection && sectionNames.includes(activeSection)
    ? activeSection
    : sectionNames[0] ?? '';

  const getValue = (key: string): string => {
    if (edits[key] !== undefined) return edits[key];
    return originalParamMap[key] === '__MIXED__' ? '' : (originalParamMap[key] ?? '');
  };

  const isMixed = (key: string): boolean => {
    return edits[key] === undefined && originalParamMap[key] === '__MIXED__';
  };

  const handleChange = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  };

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
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    const result: typeof sections = {};
    for (const [sec, params] of Object.entries(sections)) {
      const filtered = params.filter(p =>
        p.key.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[sec] = filtered;
    }
    return result;
  }, [sections, searchQuery]);

  const displaySections = searchQuery.trim() ? Object.keys(filteredSections) : sectionNames;

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
                <p className="text-[#7CBCC3] text-xs mt-0.5 truncate">
                  {files.map(f => f.filename).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7CBCC3]/15 hover:bg-[#7CBCC3]/25 border border-[#7CBCC3]/30 text-[#7CBCC3] text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/35 border border-[#6F9DE7]/40 text-[#6F9DE7] text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-[#EFEFEF]/60 hover:text-[#EFEFEF] transition-all"
            >
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
                  onClick={() => { setActiveSection(sec); setSearchQuery(''); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all
                    ${resolvedActiveSection === sec && !searchQuery
                      ? 'bg-[#1D2680]/60 text-[#6F9DE7] border-r-2 border-[#6F9DE7]'
                      : 'text-[#EFEFEF]/70 hover:bg-[#1D2571]/40 hover:text-[#EFEFEF]'
                    }`}
                >
                  <span className="text-sm">{getSectionIcon(sec)}</span>
                  <span className="truncate">{sec}</span>
                  <span className="ml-auto text-[10px] opacity-50">
                    {(searchQuery ? filteredSections[sec] : sections[sec])?.length ?? 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">
            {searchQuery.trim() ? (
              <div className="space-y-6">
                {displaySections.map(sec => (
                  <div key={sec}>
                    <h3 className="text-[#7CBCC3] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>{getSectionIcon(sec)}</span>
                      {sec}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredSections[sec]?.map(p => (
                        <ParamField
                          key={p.key}
                          paramKey={p.key}
                          value={getValue(p.key)}
                          mixed={isMixed(p.key)}
                          onChange={handleChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {displaySections.length === 0 && (
                  <p className="text-center text-[#7CBCC3]/60 text-sm mt-10">No parameters match your search.</p>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-[#7CBCC3] text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="text-base">{getSectionIcon(resolvedActiveSection)}</span>
                  {resolvedActiveSection}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(sections[resolvedActiveSection] ?? []).map(p => (
                    <ParamField
                      key={p.key}
                      paramKey={p.key}
                      value={getValue(p.key)}
                      mixed={isMixed(p.key)}
                      onChange={handleChange}
                    />
                  ))}
                </div>
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