import { SetFile, getSessionLabel } from '../types';

interface Props {
  file: SetFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function FileCard({ file, selected, onToggleSelect, onEdit }: Props) {
  // Get the human-readable label directly from types.ts
  const sessionLabel = getSessionLabel(file);

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

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200
        ${selected
          ? 'border-[#6F9DE7] bg-[#1D2680]/60 shadow-lg shadow-[#6F9DE7]/10'
          : 'border-[#1D2571]/60 bg-[#1D2571]/30 hover:border-[#6F9DE7]/50 hover:bg-[#1D2680]/40'
        }`}
    >
      <button
        onClick={() => onToggleSelect(file.id)}
        className={`absolute top-3 right-3 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all z-10
          ${selected
            ? 'border-[#6F9DE7] bg-[#6F9DE7]'
            : 'border-[#6F9DE7]/40 bg-transparent hover:border-[#6F9DE7]'
          }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="p-4 pr-10">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border mb-2 ${sessionColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {sessionLabel}
        </span>

        <h3 className="text-[#EFEFEF] font-semibold text-sm leading-tight truncate" title={file.filename}>
          {nameWithoutExt}
        </h3>
        <p className="text-[#7CBCC3] text-xs mt-0.5 font-mono">.set</p>

        <button
          onClick={() => onEdit(file.id)}
          className="mt-3 w-full rounded-lg bg-[#6F9DE7]/15 hover:bg-[#6F9DE7]/30 border border-[#6F9DE7]/30 hover:border-[#6F9DE7]/60 text-[#6F9DE7] text-xs font-semibold py-1.5 transition-all"
        >
          Edit File
        </button>
      </div>
    </div>
  );
}