import { useState, useMemo, useCallback } from 'react';
import { SetFile, getSessionLabel, serializeSetFile } from './types';
import { parseSetFile } from './parser';
import FileUpload from './components/FileUpload';
import FileCard from './components/FileCard';
import EditorModal from './components/EditorModal';
import Toolbar from './components/Toolbar';
import JSZip from 'jszip';

// @ts-ignore
import rawTemplates from 'virtual:default-sets';

interface TemplateNode {
  path: string;
  category: string;
  folderName: string;
  filename: string;
  content: string;
}

const templatesList: TemplateNode[] = Object.entries(rawTemplates as Record<string, string>).map(([path, content]) => {
  const parts = path.split('/').filter(Boolean);
  const filename = parts.pop() || 'Unknown.set';
  const folderName = parts.pop() || 'Uncategorized';
  const category = parts.pop() || 'Other';
  return { path, category, folderName, filename, content };
});

const templatesGrouped: Record<string, TemplateNode[]> = {};
for (const t of templatesList) {
  if (!templatesGrouped[t.category]) templatesGrouped[t.category] = [];
  templatesGrouped[t.category].push(t);
}

type SortMode = 'filename' | 'session';

// ── Rename Conflict Modal ─────────────────────────────────────────────────────
interface RenameConflictModalProps {
  conflictingName: string;
  onConfirm: (newName: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

function RenameConflictModal({ conflictingName, onConfirm, onSkip, onClose }: RenameConflictModalProps) {
  const base = conflictingName.replace(/\.set$/i, '');
  const [value, setValue] = useState(`${base}_copy`);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed.endsWith('.set') ? trimmed : `${trimmed}.set`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0d1240] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-base">⚠</span>
            <h2 className="text-[#EFEFEF] font-bold text-sm">Name Conflict</h2>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-[#EFEFEF]/60 hover:text-[#EFEFEF] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[#7CBCC3] text-xs">
            A file named <span className="font-mono text-amber-300">{conflictingName}</span> already exists. Choose a new name or skip this file.
          </p>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              autoFocus
              className="flex-1 rounded-lg bg-[#1D2571]/40 border border-[#1D2571]/70 text-[#EFEFEF] text-sm px-3 py-1.5 focus:outline-none focus:border-[#6F9DE7]/70 transition-all"
            />
            <span className="text-[#7CBCC3]/50 text-xs font-mono">.set</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1D2571]/60 bg-[#1D2571]/20">
          <button onClick={onSkip} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#EFEFEF]/60 hover:text-[#EFEFEF] hover:bg-white/5 transition-all">
            Skip
          </button>
          <button onClick={handleConfirm} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/35 border border-[#6F9DE7]/40 text-[#6F9DE7] text-xs font-semibold transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Use This Name
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mass Duplicate Modal ──────────────────────────────────────────────────────
interface MassDuplicateModalProps {
  sources: SetFile[];
  onConfirm: (copies: { sourceId: string; newName: string }[]) => void;
  onClose: () => void;
}

function MassDuplicateModal({ sources, onConfirm, onClose }: MassDuplicateModalProps) {
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(sources.map(f => {
      const base = f.filename.replace(/\.set$/i, '');
      return [f.id, `${base}_copy`];
    }))
  );

  const handleConfirm = () => {
    const copies = sources.map(f => ({
      sourceId: f.id,
      newName: (names[f.id] ?? '').trim().endsWith('.set')
        ? (names[f.id] ?? '').trim()
        : `${(names[f.id] ?? '').trim()}.set`,
    })).filter(c => c.newName.length > 4);
    onConfirm(copies);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#1D2571] bg-[#0d1240] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D2571]/80 bg-[#1D2571]/40">
          <h2 className="text-[#EFEFEF] font-bold text-sm">
            Duplicate — {sources.length} file{sources.length !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-[#EFEFEF]/60 hover:text-[#EFEFEF] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[#7CBCC3] text-xs mb-4">Set a filename for each copy:</p>
          {sources.map(f => (
            <div key={f.id}>
              <label className="text-[#7CBCC3] text-xs mb-1 block truncate">
                Copy of: <span className="font-mono text-[#EFEFEF]/60">{f.filename}</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={names[f.id] ?? ''}
                  onChange={e => setNames(prev => ({ ...prev, [f.id]: e.target.value }))}
                  className="flex-1 rounded-lg bg-[#1D2571]/40 border border-[#1D2571]/70 text-[#EFEFEF] text-sm px-3 py-1.5 focus:outline-none focus:border-[#6F9DE7]/70 transition-all"
                />
                <span className="text-[#7CBCC3]/50 text-xs font-mono">.set</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1D2571]/60 bg-[#1D2571]/20">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#EFEFEF]/60 hover:text-[#EFEFEF] hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleConfirm} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/35 border border-[#6F9DE7]/40 text-[#6F9DE7] text-xs font-semibold transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Create Copies
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create File Modal ─────────────────────────────────────────────────────────
interface CreateFileModalProps {
  onConfirmTemplates: (paths: string[]) => void;
  onClose: () => void;
}

function CreateFileModal({ onConfirmTemplates, onClose }: CreateFileModalProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(Object.keys(templatesGrouped)));

  const handleConfirm = () => {
    if (selectedTemplates.size === 0) return;
    onConfirmTemplates(Array.from(selectedTemplates));
  };

  const toggleSelect = (path: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const selectCategory = (items: TemplateNode[]) => {
    const allSelected = items.every(i => selectedTemplates.has(i.path));
    setSelectedTemplates(prev => {
      const next = new Set(prev);
      items.forEach(i => allSelected ? next.delete(i.path) : next.add(i.path));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1D2571] bg-[#0d1240] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D2571]/80 bg-[#1D2571]/40 shrink-0">
          <h2 className="text-[#EFEFEF] font-bold text-sm">Load Default .set File(s)</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-[#EFEFEF]/60 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {Object.keys(templatesGrouped).length === 0 ? (
            <p className="text-[#7CBCC3]/60 text-sm text-center py-8">No default sets found in the /Sets/ folder.</p>
          ) : (
            Object.entries(templatesGrouped).map(([cat, items]) => {
              const allSelected = items.every(i => selectedTemplates.has(i.path));
              return (
                <div key={cat} className="mb-4">
                  <div className="flex items-center justify-between mb-2 border-b border-[#1D2571]/50 pb-1">
                    <div
                      onClick={() => setExpandedCats(p => { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                      className="cursor-pointer text-[#6F9DE7] font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedCats.has(cat) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {cat.replace(/[-_]/g, ' ')}
                    </div>
                    <button onClick={() => selectCategory(items)} className="text-[10px] font-semibold text-[#7CBCC3] hover:text-white px-2 py-0.5 rounded bg-[#1D2571]/40 border border-[#1D2571]/80 transition-colors">
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {expandedCats.has(cat) && (
                    <div className="pl-2 space-y-1 mt-2">
                      {items.map(item => (
                        <div key={item.path} onClick={() => toggleSelect(item.path)} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#1D2571]/40 cursor-pointer group transition-all">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${selectedTemplates.has(item.path) ? 'bg-[#6F9DE7] border-[#6F9DE7]' : 'border-[#6F9DE7]/50'}`}>
                            {selectedTemplates.has(item.path) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[#EFEFEF]/80 text-sm truncate group-hover:text-white">{item.folderName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1D2571]/60 bg-[#1D2571]/20 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#EFEFEF]/60 hover:text-[#EFEFEF] hover:bg-white/5 transition-all">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={selectedTemplates.size === 0}
            className="px-4 py-1.5 rounded-lg bg-[#6F9DE7]/20 hover:bg-[#6F9DE7]/35 border border-[#6F9DE7]/40 text-[#6F9DE7] text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Load {selectedTemplates.size} File(s)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [files, setFiles] = useState<SetFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingIds, setEditingIds] = useState<string[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('filename');
  const [massDupSources, setMassDupSources] = useState<SetFile[] | null>(null);
  const [createModal, setCreateModal] = useState(false);

  // ── Conflict resolution queue ─────────────────────────────────────────────
  // Each pending item is a SetFile waiting to be named/confirmed
  const [conflictQueue, setConflictQueue] = useState<SetFile[]>([]);
  const [pendingResolved, setPendingResolved] = useState<SetFile[]>([]);

  // The head of the queue is the one currently shown in the modal
  const currentConflict = conflictQueue[0] ?? null;

  const handleConflictConfirm = (newName: string) => {
    const file = conflictQueue[0];
    const renamed = { ...file, filename: newName };
    const remaining = conflictQueue.slice(1);
    const resolved = [...pendingResolved, renamed];

    if (remaining.length === 0) {
      // All conflicts resolved — commit everything
      commitFiles(resolved);
      setPendingResolved([]);
      setConflictQueue([]);
    } else {
      setPendingResolved(resolved);
      setConflictQueue(remaining);
    }
  };

  const handleConflictSkip = () => {
    const remaining = conflictQueue.slice(1);
    if (remaining.length === 0) {
      commitFiles(pendingResolved);
      setPendingResolved([]);
      setConflictQueue([]);
    } else {
      setConflictQueue(remaining);
    }
  };

  const handleConflictClose = () => {
    // Cancel entire remaining queue, commit what's already resolved
    commitFiles(pendingResolved);
    setPendingResolved([]);
    setConflictQueue([]);
  };

  // Directly adds files to state (no conflict check — already resolved)
  const commitFiles = (newFiles: SetFile[]) => {
    if (newFiles.length === 0) return;
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.id, f]));
      for (const nf of newFiles) map.set(nf.id, nf);
      return Array.from(map.values());
    });
  };

  // ── File loading — checks for conflicts before committing ─────────────────
  const handleFilesLoaded = (newFiles: SetFile[]) => {
    const existingNames = new Set(files.map(f => f.filename));
    const safe: SetFile[] = [];
    const conflicts: SetFile[] = [];

    for (const nf of newFiles) {
      if (existingNames.has(nf.filename)) {
        conflicts.push(nf);
      } else {
        safe.push(nf);
        // Add to set so subsequent files in the same batch also detect the name
        existingNames.add(nf.filename);
      }
    }

    // Immediately add non-conflicting files
    if (safe.length > 0) {
      setFiles(prev => [...prev, ...safe]);
    }

    // Queue conflicts for resolution
    if (conflicts.length > 0) {
      setPendingResolved([]);
      setConflictQueue(conflicts);
    }
  };

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sortedFiles = useMemo(() => {
    const copy = [...files];
    if (sortMode === 'filename') {
      copy.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
      copy.sort((a, b) => {
        const sa = getSessionLabel(a);
        const sb = getSessionLabel(b);
        if (sa !== sb) return sa.localeCompare(sb);
        return a.filename.localeCompare(b.filename);
      });
    }
    return copy;
  }, [files, sortMode]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedIds(files.map(f => f.id));
  const deselectAll = () => setSelectedIds([]);

  // ── Session grouping ──────────────────────────────────────────────────────
  const sessionGroups = useMemo(() => {
    if (sortMode !== 'session') return null;
    const groups: Record<string, SetFile[]> = {};
    for (const file of sortedFiles) {
      const label = getSessionLabel(file);
      if (!groups[label]) groups[label] = [];
      groups[label].push(file);
    }
    return groups;
  }, [sortMode, sortedFiles]);

  const selectSession = useCallback((session: string) => {
    if (!sessionGroups) return;
    const groupIds = (sessionGroups[session] ?? []).map(f => f.id);
    setSelectedIds(prev => {
      const existing = new Set(prev);
      const allInGroup = groupIds.every(id => existing.has(id));
      if (allInGroup) return prev.filter(id => !groupIds.includes(id));
      return Array.from(new Set([...prev, ...groupIds]));
    });
  }, [sessionGroups]);

  // ── Editing ───────────────────────────────────────────────────────────────
  const openEditor = (id: string) => setEditingIds([id]);
  const openMultiEditor = () => { if (selectedIds.length > 0) setEditingIds([...selectedIds]); };

  const editingFiles = useMemo(() => {
    if (!editingIds) return [];
    return editingIds.map(id => files.find(f => f.id === id)!).filter(Boolean);
  }, [editingIds, files]);

  const handleSave = (updated: SetFile[]) => {
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.id, f]));
      for (const uf of updated) map.set(uf.id, uf);
      return prev.map(f => map.get(f.id) ?? f);
    });
    setEditingIds(null);
  };

  // ── Download (with zip for > 10 files) ───────────────────────────────────
  const downloadFiles = async (ids: string[]) => {
    const toDownload = files.filter(f => ids.includes(f.id));
    if (toDownload.length === 0) return;

    if (toDownload.length > 10) {
      const zip = new JSZip();
      for (const file of toDownload) {
        zip.file(file.filename, serializeSetFile(file));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'set-files.zip';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      for (const file of toDownload) {
        const blob = new Blob([serializeSetFile(file)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const downloadSelected = () => downloadFiles(selectedIds);

  // ── Remove ────────────────────────────────────────────────────────────────
  const removeSelected = () => {
    setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

  const removeSingle = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  // ── Duplicate (single — now always prompts via MassDuplicateModal) ────────
  const duplicateSingle = (id: string) => {
    const source = files.find(f => f.id === id);
    if (!source) return;
    setMassDupSources([source]);
  };

  const duplicateSelected = () => {
    const sources = files.filter(f => selectedIds.includes(f.id));
    if (sources.length === 0) return;
    setMassDupSources(sources);
  };

  const confirmMassDuplicate = (copies: { sourceId: string; newName: string }[]) => {
    setMassDupSources(null);
    const existingNames = new Set(files.map(f => f.filename));
    const safe: SetFile[] = [];
    const conflicts: SetFile[] = [];

    for (const c of copies) {
      const source = files.find(f => f.id === c.sourceId)!;
      const newFile: SetFile = {
        ...source,
        id: crypto.randomUUID(),
        filename: c.newName,
        lines: source.lines.map(l => ({ ...l })),
      };
      if (existingNames.has(newFile.filename)) {
        conflicts.push(newFile);
      } else {
        safe.push(newFile);
        existingNames.add(newFile.filename);
      }
    }

    if (safe.length > 0) setFiles(prev => [...prev, ...safe]);
    if (conflicts.length > 0) {
      setPendingResolved([]);
      setConflictQueue(conflicts);
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameSingle = (id: string, newName: string) => {
    const existingNames = new Set(
      files.filter(f => f.id !== id).map(f => f.filename)
    );
    if (existingNames.has(newName)) {
      // Treat the renamed file as a conflict to resolve
      const file = files.find(f => f.id === id)!;
      const pending = { ...file, filename: newName };
      setPendingResolved([]);
      setConflictQueue([pending]);
      // Note: we don't apply the rename yet — it'll be applied after resolution
      // We need to remove the old file and re-add with new name
      setFiles(prev => prev.filter(f => f.id !== id));
    } else {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, filename: newName } : f));
    }
  };

  // ── Create from Defaults ──────────────────────────────────────────────────
  const confirmCreateTemplates = (paths: string[]) => {
    const newFiles: SetFile[] = paths.map(path => {
      const t = templatesList.find(x => x.path === path);
      if (!t) return null;
      const resultingName = t.folderName.endsWith('.set') ? t.folderName : `${t.folderName}.set`;
      return parseSetFile(resultingName, t.content);
    }).filter(Boolean) as SetFile[];

    handleFilesLoaded(newFiles);
    setCreateModal(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f2e' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(29,38,128,0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,188,195,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6F9DE7]/30 bg-[#6F9DE7]/10 shrink-0">
              <svg className="w-5 h-5 text-[#6F9DE7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#EFEFEF] tracking-tight leading-tight">MT5 .set File Editor</h1>
              <p className="text-[#7CBCC3] text-sm">Load, edit, and download MT5 Expert Advisor configuration files</p>
            </div>
          </div>
          <div className="flex items-center gap-4 border border-[#1D2571]/60 bg-[#1D2571]/20 px-4 py-2 rounded-xl">
            <a href="https://tradewithpat.com/" target="_blank" rel="noopener noreferrer" className="text-[#7CBCC3]/60 hover:text-[#7CBCC3] text-xs font-semibold transition-all">Trade With Pat</a>
            <span className="text-[#1D2571]">|</span>
            <a href="https://discord.gg/HyDuecS9AY" target="_blank" rel="noopener noreferrer" className="text-[#7CBCC3]/60 hover:text-[#7CBCC3] text-xs font-semibold transition-all">TWP Discord</a>
            <span className="text-[#1D2571]">|</span>
            <a href="https://github.com/jaredraga/twp-set-file-editor/" target="_blank" rel="noopener noreferrer" className="text-[#7CBCC3]/60 hover:text-[#EFEFEF] transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </header>

        {/* Upload zone */}
        <div className="mb-6">
          <FileUpload onFilesLoaded={handleFilesLoaded} />
        </div>

        {/* Toolbar */}
        {files.length > 0 && (
          <div className="mb-5">
            <Toolbar
              totalFiles={files.length}
              selectedIds={selectedIds}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onSelectAll={selectAll}
              onSelectSession={selectSession}
              onDeselectAll={deselectAll}
              onEditSelected={openMultiEditor}
              onDownloadSelected={downloadSelected}
              onRemoveSelected={removeSelected}
              onDuplicateSelected={duplicateSelected}
              onCreateNew={() => setCreateModal(true)}
              sessionGroups={sessionGroups}
            />
          </div>
        )}

        {/* Files grid */}
        {files.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-16 w-16 rounded-2xl border border-[#1D2571]/60 bg-[#1D2571]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1D2571]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-[#EFEFEF]/40 text-sm">No files loaded yet. Upload your .set files above.</p>
            <button
              onClick={() => setCreateModal(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6F9DE7]/10 hover:bg-[#6F9DE7]/20 border border-[#6F9DE7]/25 text-[#6F9DE7] text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Load default .set files
            </button>
          </div>
        ) : sortMode === 'session' && sessionGroups ? (
          <div className="space-y-8">
            {Object.entries(sessionGroups).map(([sessionLabel, groupFiles]) => (
              <div key={sessionLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => selectSession(sessionLabel)} className="text-[#7CBCC3] text-xs font-bold uppercase tracking-widest hover:text-[#7CBCC3]/80 transition-all">
                    {sessionLabel}
                  </button>
                  <div className="flex-1 h-px bg-[#1D2571]/50" />
                  <span className="text-[#7CBCC3]/50 text-xs">{groupFiles.length} file{groupFiles.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {groupFiles.map(file => (
                    <FileCard key={file.id} file={file} selected={selectedIds.includes(file.id)} onToggleSelect={toggleSelect} onEdit={openEditor} onDuplicate={duplicateSingle} onRename={renameSingle} onRemove={removeSingle} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sortedFiles.map(file => (
              <FileCard key={file.id} file={file} selected={selectedIds.includes(file.id)} onToggleSelect={toggleSelect} onEdit={openEditor} onDuplicate={duplicateSingle} onRename={renameSingle} onRemove={removeSingle} />
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editingIds && editingFiles.length > 0 && (
        <EditorModal files={editingFiles} onSave={handleSave} onClose={() => setEditingIds(null)} />
      )}

      {/* Mass duplicate modal */}
      {massDupSources && (
        <MassDuplicateModal sources={massDupSources} onConfirm={confirmMassDuplicate} onClose={() => setMassDupSources(null)} />
      )}

      {/* Default Sets Modal */}
      {createModal && (
        <CreateFileModal onConfirmTemplates={confirmCreateTemplates} onClose={() => setCreateModal(false)} />
      )}

      {/* Conflict resolution modal — z-[60] so it appears above everything */}
      {currentConflict && (
        <RenameConflictModal
          conflictingName={currentConflict.filename}
          onConfirm={handleConflictConfirm}
          onSkip={handleConflictSkip}
          onClose={handleConflictClose}
        />
      )}
    </div>
  );
}