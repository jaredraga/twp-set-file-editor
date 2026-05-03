import { useState, useRef, useEffect } from 'react';
import { SetFile, getSessionLabel } from '../types';

interface Props {
  file: SetFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onRemove: (id: string) => void;
}

export default function FileCard({ file, selected, onToggleSelect, onEdit, onDuplicate, onRename, onRemove }: Props) {
  const sessionLabel = getSessionLabel(file);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const sessionColors: Record<string, string> = {
    Asian: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    European: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    London: 'bg-[#6F9DE7]/20 text-[#6F9DE7] border-[#6F9DE7]/30',
    American: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    NYSE: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Custom Range': 'bg-[#7CBCC3]/20 text-[#7CBCC3] border-[#7CBCC3]/30',
  };

  const sessionColor = sessionColors[sessionLabel] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  const nameWithoutExt = file.filename.replace(/\.set$/i, '');

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Focus rename input when shown
  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  const startRename = () => {
    setMenuOpen(false);
    setRenameValue(nameWithoutExt);
    setRenaming(true);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== nameWithoutExt) {
      onRename(file.id, trimmed.endsWith('.set') ? trimmed : `${trimmed}.set`);
    }
    setRenaming(false);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenaming(false);
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 p-4 flex flex-col h-full
        ${selected
          ? 'border-[#6F9DE7] bg-[#1D2680]/60 shadow-lg shadow-[#6F9DE7]/10'
          : 'border-[#1D2571]/60 bg-[#1D2571]/30 hover:border-[#6F9DE7]/50 hover:bg-[#1D2680]/40'
        }`}
    >
      {/* Top Row: Session label and Checkbox */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${sessionColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
          <span className="truncate">{sessionLabel}</span>
        </span>
        <button
          onClick={() => onToggleSelect(file.id)}
          className={`h-5 w-5 rounded-md border-2 flex flex-shrink-0 items-center justify-center transition-all z-10
            ${selected
              ? 'border-[#6F9DE7] bg-[#6F9DE7]'
              : 'border-[#6F9DE7]/40 bg-[#0d1240]/50 hover:border-[#6F9DE7]'
            }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {renaming ? (
        <input
          ref={renameRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleRenameKey}
          className="w-full rounded-md bg-[#1D2571]/60 border border-[#6F9DE7]/60 text-[#EFEFEF] text-sm px-2 py-0.5 focus:outline-none mb-1"
        />
      ) : (
        <h3 className="text-[#EFEFEF] font-semibold text-sm leading-tight break-all line-clamp-2" title={file.filename}>
          {nameWithoutExt}
        </h3>
      )}
      <p className="text-[#7CBCC3] text-xs mt-0.5 font-mono mb-3">.set</p>

      {/* spacer to push buttons to bottom */}
      <div className="mt-auto" />

      {/* Bottom Row: Edit Button and Context Menu (dots) */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#1D2571]/40">
        <button
          onClick={() => onEdit(file.id)}
          className="flex-1 rounded-lg bg-[#6F9DE7]/15 hover:bg-[#6F9DE7]/30 border border-[#6F9DE7]/30 hover:border-[#6F9DE7]/60 text-[#6F9DE7] text-xs font-semibold py-1.5 transition-all"
        >
          Edit File
        </button>

        <div ref={menuRef} className="relative z-10 flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#1D2571]/60 text-[#7CBCC3]/60 hover:text-[#7CBCC3] hover:bg-[#1D2571]/60 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="File options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-44 rounded-lg border border-[#1D2571] bg-[#0d1240] shadow-xl z-20 overflow-hidden py-1">
              <button
                onClick={() => { setMenuOpen(false); onEdit(file.id); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-[#EFEFEF]/80 hover:bg-[#1D2571]/60 hover:text-[#EFEFEF] transition-all"
              >
                <svg className="w-3.5 h-3.5 text-[#6F9DE7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Edit
              </button>
              <button
                onClick={startRename}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-[#EFEFEF]/80 hover:bg-[#1D2571]/60 hover:text-[#EFEFEF] transition-all"
              >
                <svg className="w-3.5 h-3.5 text-[#7CBCC3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Rename
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDuplicate(file.id); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-[#EFEFEF]/80 hover:bg-[#1D2571]/60 hover:text-[#EFEFEF] transition-all"
              >
                <svg className="w-3.5 h-3.5 text-[#7CBCC3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
                Duplicate
              </button>
              <div className="h-px bg-[#1D2571]/60 mx-2 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onRemove(file.id); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}