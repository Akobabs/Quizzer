import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  uploadError: string | null;
  disabled: boolean;
}

const MAX_SIZE_MB = 10;

export default function FileUpload({
  onUpload,
  uploadError,
  disabled,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback((file: File) => {
    setLocalError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setLocalError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    setSelected(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    e.target.value = "";
  };

  const handleClear = () => {
    setSelected(null);
    setLocalError(null);
  };

  const displayError = localError ?? uploadError;

  return (
    <div className="animate-fade-in">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF"
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all cursor-pointer select-none
          ${dragOver ? "border-indigo-400 bg-indigo-950/40" : "border-slate-700 hover:border-slate-500 hover:bg-slate-900/50"}
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleChange}
          disabled={disabled}
        />

        {/* Upload icon */}
        <div className={`rounded-full p-4 ${dragOver ? "bg-indigo-500/20" : "bg-slate-800"}`}>
          <svg
            className={`h-8 w-8 ${dragOver ? "text-indigo-400" : "text-slate-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>

        <div>
          <p className="text-slate-200 font-medium">
            {dragOver ? "Drop to upload" : "Drop your PDF here"}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            or <span className="text-indigo-400">browse files</span> &mdash; up to {MAX_SIZE_MB} MB
          </p>
        </div>
      </div>

      {/* Selected file info */}
      {selected && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-5 py-3.5 animate-slide-up">
          <div className="flex items-center gap-3 min-w-0">
            <svg className="h-5 w-5 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-slate-200 text-sm font-medium truncate">{selected.name}</span>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-slate-500 text-xs">
              {(selected.size / (1024 * 1024)).toFixed(2)} MB
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Remove file"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {displayError && (
        <p className="mt-3 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {displayError}
        </p>
      )}

      {/* Generate button */}
      {selected && !localError && (
        <button
          onClick={() => onUpload(selected)}
          disabled={disabled}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed animate-slide-up"
        >
          Generate Quiz
        </button>
      )}
    </div>
  );
}
