import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropProps {
  label?: string;
  hint?: string;
  /** Names of already-attached files (controlled). */
  files: string[];
  onChange: (fileNames: string[]) => void;
  /**
   * Optional — receives the real `File` blobs just picked/dropped (not the cumulative list), so a
   * caller that needs to actually upload the file (multipart `FormData`) can keep it in state. Names
   * alone (`onChange`) are enough for display-only/mock usage.
   */
  onFilesChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

/**
 * Document attach control. Exposes file names via `onChange` for display/mock use, and the real
 * `File` blobs via `onFilesChange` for callers that need to send multipart/form-data.
 */
export function FileDrop({ label, hint, files, onChange, onFilesChange, accept = ".pdf,.jpg,.png", multiple = true, className }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const names = picked.map((f) => f.name);
    onChange(multiple ? [...new Set([...files, ...names])] : names.slice(0, 1));
    onFilesChange?.(multiple ? picked : picked.slice(0, 1));
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
          "group flex flex-col items-center justify-center gap-1.5 rounded-(--radius-card) border-2 border-dashed px-4 py-6 transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.99]",
          dragging ? "border-primary bg-primary-soft/70 scale-[1.01] shadow-[0_8px_24px_rgb(27_122_83_/_0.12)]" : "border-line-strong bg-paper/60 hover:border-primary/60 hover:bg-primary-soft/35 hover:-translate-y-px hover:shadow-[0_7px_20px_rgb(15_23_18_/_0.07)]",
        )}
      >
        <Upload className="size-5 text-muted transition-[color,transform] duration-200 group-hover:text-primary group-hover:-translate-y-0.5" aria-hidden />
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
            <li key={name} className="flex items-center gap-2 rounded-(--radius-ctl) border border-line bg-surface px-3 py-2 text-[13px] transition-[border-color,box-shadow,transform] duration-200 hover:border-primary/30 hover:shadow-(--shadow-card) hover:-translate-y-px">
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
