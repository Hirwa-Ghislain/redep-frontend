import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropProps {
  label?: string;
  hint?: string;
  /** Names of already-attached files (controlled). */
  files: string[];
  onChange: (fileNames: string[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

/**
 * Document attach control. In mock mode we only keep file names — the HTTP layer
 * will send real `File` objects as multipart/form-data when the backend lands.
 */
export function FileDrop({ label, hint, files, onChange, accept = ".pdf,.jpg,.png", multiple = true, className }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const names = Array.from(list).map((f) => f.name);
    onChange(multiple ? [...new Set([...files, ...names])] : names.slice(0, 1));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-(--radius-card) border-2 border-dashed px-4 py-6 transition-colors",
          dragging ? "border-primary bg-primary-soft/50" : "border-line-strong bg-paper/60 hover:border-faint",
        )}
      >
        <Upload className="size-5 text-muted" aria-hidden />
        <span className="text-[13.5px] text-ink font-medium">Drop files here or click to browse</span>
        <span className="text-[12px] text-faint">{accept.replaceAll(",", " · ")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-1">
          {files.map((name) => (
            <li key={name} className="flex items-center gap-2 rounded-(--radius-ctl) border border-line bg-surface px-3 py-2 text-[13px]">
              <FileText className="size-4 text-primary-deep shrink-0" aria-hidden />
              <span className="truncate flex-1 text-ink">{name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((f) => f !== name))}
                aria-label={`Remove ${name}`}
                className="p-0.5 rounded text-faint hover:text-clay transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
