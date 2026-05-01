import { useState, useMemo } from 'react';
import { SetFile, getSessionLabel, serializeSetFile } from './types';
import FileUpload from './components/FileUpload';
import FileCard from './components/FileCard';
import EditorModal from './components/EditorModal';
import Toolbar from './components/Toolbar';

type SortMode = 'filename' | 'session';

export default function App() {
  const [files, setFiles] = useState<SetFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingIds, setEditingIds] = useState<string[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('filename');

  // ── File loading ──────────────────────────────────────────────────────────
  const handleFilesLoaded = (newFiles: SetFile[]) => {
    setFiles(prev => {
      // Avoid duplicates by filename — replace if same filename
      const existingNames = new Map(prev.map(f => [f.filename, f.id]));
      const merged = [...prev];
      for (const nf of newFiles) {
        const existingId = existingNames.get(nf.filename);
        if (existingId) {
          const idx = merged.findIndex(f => f.id === existingId);
          if (idx !== -1) merged[idx] = { ...nf, id: existingId };
        } else {
          merged.push(nf);
        }
      }
      return merged;
    });
  };

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sortedFiles = useMemo(() => {
    const copy = [...files];
    if (sortMode === 'filename') {
      copy.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
      copy.sort((a, b) => {
        const sa = getTradeSession(a);
        const sb = getTradeSession(b);
        if (sa !== sb) return sa - sb;
        return a.filename.localeCompare(b.filename);
      });
    }
    return copy;
  }, [files, sortMode]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(files.map(f => f.id));
  const deselectAll = () => setSelectedIds([]);

  // ── Editing ───────────────────────────────────────────────────────────────
  const openEditor = (id: string) => setEditingIds([id]);
  const openMultiEditor = () => {
    if (selectedIds.length > 0) setEditingIds([...selectedIds]);
  };

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

  const handleCloseEditor = () => setEditingIds(null);

  // ── Download ──────────────────────────────────────────────────────────────
  const downloadFiles = (ids: string[]) => {
    const toDownload = files.filter(f => ids.includes(f.id));
    for (const file of toDownload) {
      const blob = new Blob([serializeSetFile(file)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadSelected = () => downloadFiles(selectedIds);

  // ── Remove ────────────────────────────────────────────────────────────────
  const removeSelected = () => {
    setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

// ── Session grouping for session-sort display ──────────────────────────────
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f2e' }}>
      {/* Background decoration */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(29,38,128,0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,188,195,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6F9DE7]/30 bg-[#6F9DE7]/10">
              <svg className="w-5 h-5 text-[#6F9DE7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#EFEFEF] tracking-tight leading-tight">
                MT5 .set File Editor
              </h1>
              <p className="text-[#7CBCC3] text-sm">
                Load, edit, and download MetaTrader 5 Expert Advisor configuration files
              </p>
            </div>
          </div>
        </header>

        {/* Upload zone */}
        <div className="mb-6">
          <FileUpload onFilesLoaded={handleFilesLoaded} />
        </div>

        {/* Toolbar — only show when files exist */}
        {files.length > 0 && (
          <div className="mb-5">
            <Toolbar
              totalFiles={files.length}
              selectedIds={selectedIds}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onEditSelected={openMultiEditor}
              onDownloadSelected={downloadSelected}
              onRemoveSelected={removeSelected}
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
          </div>
        ) : sortMode === 'session' && sessionGroups ? (
          // Session-grouped view
          <div className="space-y-8">
            {Object.entries(sessionGroups).map(([sessionLabel, groupFiles]) => (
              <div key={sessionLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#7CBCC3] text-xs font-bold uppercase tracking-widest">{sessionLabel}</span>
                  <div className="flex-1 h-px bg-[#1D2571]/50" />
                  <span className="text-[#7CBCC3]/50 text-xs">{groupFiles.length} file{groupFiles.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {groupFiles.map(file => (
                    <FileCard
                      key={file.id}
                      file={file}
                      selected={selectedIds.includes(file.id)}
                      onToggleSelect={toggleSelect}
                      onEdit={openEditor}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat filename-sorted view
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sortedFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                selected={selectedIds.includes(file.id)}
                onToggleSelect={toggleSelect}
                onEdit={openEditor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editingIds && editingFiles.length > 0 && (
        <EditorModal
          files={editingFiles}
          onSave={handleSave}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
