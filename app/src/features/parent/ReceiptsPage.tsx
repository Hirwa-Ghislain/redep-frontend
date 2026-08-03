import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { LogoMark } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { paymentService } from "@/services/paymentService";
import { USE_MOCKS } from "@/lib/api/client";
import { toast } from "@/stores/uiStore";
import { formatDateTime, formatRWF } from "@/lib/format";
import { CHANNEL_LABEL, FEE_CATEGORY_LABEL } from "@/lib/status";
import type { Receipt } from "@/types";

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts", user?.id, q],
    queryFn: () => paymentService.receiptsByParent(user!.id, q || undefined),
    enabled: Boolean(user),
  });

  async function downloadReceipt(receipt: Receipt) {
    if (USE_MOCKS) {
      toast({ title: "Receipt downloaded", description: `${receipt.reference}.pdf (simulated)`, variant: "success" });
      return;
    }
    setDownloading(true);
    try {
      const blob = await paymentService.downloadReceiptBlob(receipt.paymentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receipt.reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not fetch the receipt PDF. Try again.", variant: "error" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Receipts"
        description="Every payment issues a digital receipt — searchable, verifiable, downloadable."
      />
      <SearchInput value={q} onChange={setQ} placeholder="Search reference, child or school…" className="w-full sm:w-72 mb-4" />

      <DataTable<Receipt>
        loading={isLoading}
        columns={[
          { key: "issuedAt", header: "Issued", render: (r) => <span className="tnum">{formatDateTime(r.issuedAt)}</span> },
          { key: "reference", header: "Reference", render: (r) => <span className="tnum font-medium">{r.reference}</span> },
          { key: "studentName", header: "Child" },
          { key: "schoolName", header: "School" },
          { key: "category", header: "Category", render: (r) => FEE_CATEGORY_LABEL[r.category] },
          { key: "amount", header: "Amount", align: "right", render: (r) => <span className="tnum font-semibold">{formatRWF(r.amount)}</span> },
        ]}
        rows={receipts}
        keyField={(r) => r.id}
        onRowClick={setSelected}
        pageSize={10}
        empty="No receipts yet — they appear as soon as a payment completes."
      />

      {/* Receipt viewer */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Receipt"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button
              icon={<Download className="size-4" />}
              loading={downloading}
              onClick={() => selected && downloadReceipt(selected)}
            >
              Download PDF
            </Button>
          </>
        }
      >
        {selected && (
          <div className="rounded-(--radius-card) border border-line bg-paper/50 overflow-hidden">
            <div className="flex items-center justify-between bg-pine px-5 py-4">
              <div className="flex items-center gap-3">
                <LogoMark size={30} />
                <div>
                  <p className="font-display font-bold text-paper text-[14px] leading-none">OFFICIAL RECEIPT</p>
                  <p className="text-[11px] text-paper/50 mt-1">Rwanda Education Digital Ecosystem Platform</p>
                </div>
              </div>
              <p className="font-display font-bold text-gold tnum text-[15px]">{selected.reference}</p>
            </div>
            <div className="px-5 py-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[13.5px]">
                <div><dt className="text-muted text-[12px]">School</dt><dd className="font-medium text-ink">{selected.schoolName}</dd></div>
                {selected.termLabel && (
                  <div><dt className="text-muted text-[12px]">Term</dt><dd className="font-medium text-ink">{selected.termLabel}</dd></div>
                )}
                <div><dt className="text-muted text-[12px]">Student</dt><dd className="font-medium text-ink">{selected.studentName}</dd></div>
                <div><dt className="text-muted text-[12px]">Paid by</dt><dd className="font-medium text-ink">{selected.parentName}</dd></div>
                <div><dt className="text-muted text-[12px]">Category</dt><dd className="font-medium text-ink">{FEE_CATEGORY_LABEL[selected.category]}</dd></div>
                <div><dt className="text-muted text-[12px]">Channel</dt><dd className="font-medium text-ink">{CHANNEL_LABEL[selected.channelType]}</dd></div>
                <div className="col-span-2">
                  <dt className="text-muted text-[12px]">Date & time</dt>
                  <dd className="font-medium text-ink tnum">{formatDateTime(selected.issuedAt)}</dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3.5">
                <span className="text-[13px] font-medium text-primary-deep">Amount paid</span>
                <span className="font-display text-[22px] font-bold text-primary-deep tnum">{formatRWF(selected.amount)}</span>
              </div>
              <p className="flex items-center gap-1.5 text-[11.5px] text-faint mt-4">
                <ReceiptText className="size-3.5" />
                Verify anytime at eshuri.rw/verify-receipt with reference {selected.reference}.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
