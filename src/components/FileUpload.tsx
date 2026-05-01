import React, { useRef, useState } from 'react';
import { parseSetFile } from '../parser';
import { SetFile } from '../types';

interface Props {
  onFilesLoaded: (files: SetFile[]) => void;
}

export default function FileUpload({ onFilesLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFiles = async (fileList: FileList) => {
    const results: SetFile[] = [];
    for (const file of Array.from(fileList)) {
      const text = await file.text();
      results.push(parseSetFile(file.name, text));
    }
    onFilesLoaded(results);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      readFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer
        ${dragging
          ? 'border-[#6F9DE7] bg-[#1D2680]/20 scale-[1.02]'
          : 'border-[#6F9DE7]/50 bg-[#1D2571]/20 hover:border-[#6F9DE7] hover:bg-[#1D2680]/25'
        }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".set"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6F9DE7]/20 border border-[#6F9DE7]/40">
        <svg className="w-7 h-7 text-[#6F9DE7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[#EFEFEF] font-semibold text-sm">Drop .set files here or click to browse</p>
        <p className="text-[#7CBCC3] text-xs mt-1">Upload one or multiple files at once</p>
      </div>
    </div>
  );
}
