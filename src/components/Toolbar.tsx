interface Props {
  totalFiles: number;
  selectedIds: string[];
  sortMode: 'filename' | 'session';
  onSortChange: (mode: 'filename' | 'session') => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEditSelected: () => void;
  onDownloadSelected: () => void;
  onRemoveSelected: () => void;
}

export default function Toolbar({
  totalFiles,
  selectedIds,
  sortMode,
  onSortChange,
  onSelectAll,
  onDeselectAll,
  onEditSelected,
  onDownloadSelected,
  onRemoveSelected,
}: Props) {
  const hasSelection = selectedIds.length > 0;
  const allSelected = selectedIds.length === totalFiles && totalFiles > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-[#1D2571]/60 bg-[#1D2571]/20">
      {/* Sort controls */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#7CBCC3] text-xs font-semibold uppercase tracking-wider mr-1">Sort:</span>
        <button
          onClick={() => onSortChange('filename')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
            ${sortMode === 'filename'
              ? 'bg-[#6F9DE7]/25 text-[#6F9DE7] border border-[#6F9DE7]/50'
              : 'text-[#EFEFEF]/60 hover:text-[#EFEFEF] hover:bg-white/5 border border-transparent'
            }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h10M3 12h7m-7 5h4M17 3l4 4m0 0l-4 4m4-4H10" />
          </svg>
          Filename
        </button>
        <button
          onClick={() => onSortChange('session')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
            ${sortMode === 'session'
              ? 'bg-[#7CBCC3]/25 text-[#7CBCC3] border border-[#7CBCC3]/50'
              : 'text-[#EFEFEF]/60 hover:text-[#EFEFEF] hover:bg-white/5 border border-transparent'
            }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Session
        </button>
      </div>

      <div className="h-4 w-px bg-[#1D2571] mx-1" />

      {/* Select all / deselect */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          disabled={totalFiles === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#EFEFEF]/70 hover:text-[#EFEFEF] hover:bg-white/5 border border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {allSelected ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Deselect All
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Select All
            </>
          )}
        </button>
      </div>

      {/* Selection actions */}
      {hasSelection && (
        <>
          <div className="h-4 w-px bg-[#1D2571] mx-1" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#7CBCC3] text-xs font-semibold bg-[#7CBCC3]/10 border border-[#7CBCC3]/30 rounded-full px-2 py-0.5">
              {selectedIds.length} selected
            </span>
            <button
              onClick={onEditSelected}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#6F9DE7]/15 hover:bg-[#6F9DE7]/30 border border-[#6F9DE7]/30 text-[#6F9DE7] transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit
            </button>
            <button
              onClick={onDownloadSelected}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#7CBCC3]/15 hover:bg-[#7CBCC3]/25 border border-[#7CBCC3]/30 text-[#7CBCC3] transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              onClick={onRemoveSelected}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Remove
            </button>
          </div>
        </>
      )}

      <div className="ml-auto text-[#7CBCC3]/50 text-xs">
        {totalFiles} file{totalFiles !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
