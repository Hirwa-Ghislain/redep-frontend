import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  /** Rows per page; omit for no pagination. */
  pageSize?: number;
  dense?: boolean;
}

export function DataTable<T>({ columns, rows, keyField, onRowClick, loading, empty, pageSize, dense }: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const pages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = Math.min(page, pages - 1);
  const visible = pageSize ? rows.slice(safePage * pageSize, (safePage + 1) * pageSize) : rows;

  const alignCls = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-paper/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint whitespace-nowrap",
                    alignCls(c.align),
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                  {empty ?? "Nothing here yet."}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={keyField(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-line last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-paper/80",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4", dense ? "py-1.5" : "py-2.5", alignCls(c.align), c.className)}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageSize && rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px] text-muted">
          <span className="tnum">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg hover:bg-ink/5 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="tnum px-1">
              {safePage + 1} / {pages}
            </span>
            <button
              className="p-1.5 rounded-lg hover:bg-ink/5 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={safePage >= pages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
