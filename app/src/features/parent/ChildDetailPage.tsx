import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CalendarCheck, MessageSquare, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Input";
import { UnderDevelopment } from "@/components/ui/UnderDevelopment";
import { useAuth } from "@/hooks/useAuth";
import { commsService } from "@/services/commsService";
import { fetchParentAttendance, studentService } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatRWF, fullName, percent } from "@/lib/format";
import { ATTENDANCE_STATUS, FEE_CATEGORY_LABEL, STUDENT_STATUS } from "@/lib/status";
import type { FeeBalance, TeacherProfile } from "@/types";

export default function ChildDetailPage() {
  const { studentId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("academics");
  const [messageTo, setMessageTo] = useState<TeacherProfile | null>(null);
  const [messageBody, setMessageBody] = useState("");

  const { data: context, isLoading } = useQuery({
    queryKey: ["student-context", studentId],
    queryFn: () => studentService.context(studentId),
  });
  const { data: realAttendance } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: () => fetchParentAttendance(studentId),
  });
  const balances: FeeBalance[] = (context?.student.charges ?? []).map((c) => ({
    studentId,
    feeStructureId: c.id,
    feeName: c.feeName,
    category: c.feeType,
    billed: c.amountDue,
    paid: c.amountPaid,
    due: Math.max(0, c.amountDue - c.amountPaid),
  }));
  const attendanceRate = realAttendance?.attendanceRate;

  const startThread = useMutation({
    mutationFn: () =>
      commsService.startThread({
        subject: `${context!.student.firstName} — ${messageTo!.subjects[0] ?? "Academics"}`,
        schoolId: context!.school.id,
        studentId,
        studentName: fullName(context!.student),
        participants: [
          { id: user!.id, name: fullName(user!), role: "PARENT" },
          { id: messageTo!.id, name: messageTo!.name, role: "TEACHER" },
        ],
        firstMessage: { senderId: user!.id, senderName: fullName(user!), senderRole: "PARENT", body: messageBody },
      }),
    onSuccess: () => {
      setMessageTo(null);
      setMessageBody("");
      void qc.invalidateQueries({ queryKey: ["threads"] });
      toast({ title: "Message sent", description: "Continue the conversation in Messages.", variant: "success" });
      navigate("/parent/messages");
    },
  });

  if (isLoading || !context) {
    return (
      <PageTransition>
        <Skeleton className="h-24 mb-4" />
        <Skeleton className="h-72" />
      </PageTransition>
    );
  }

  const { student, school, schoolClass, teachers } = context;
  const statusMeta = STUDENT_STATUS[student.status];
  const totalDue = balances.reduce((s, b) => s + b.due, 0);

  return (
    <PageTransition>
      <PageHeader backTo="/parent/children" backLabel="My children" title="" className="mb-2" />

      <Card padded={false} className="p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3.5">
          <Avatar name={fullName(student)} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[17px] font-bold text-ink leading-tight">{fullName(student)}</h1>
            <p className="text-[12.5px] text-muted mt-0.5">
              {schoolClass?.name ?? "—"} · {school.name} · {school.district}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="font-display font-bold text-[16px] text-ink tnum leading-5">
                {attendanceRate !== undefined ? percent(attendanceRate) : "…"}
              </p>
              <p className="text-[11px] text-muted">Attendance</p>
            </div>
            <div className="text-right">
              <p className={`font-display font-bold text-[16px] tnum leading-5 ${totalDue ? "text-clay-deep" : "text-primary-deep"}`}>
                {formatRWF(totalDue)}
              </p>
              <p className="text-[11px] text-muted">Due</p>
            </div>
            <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
          </div>
        </div>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: "academics", label: "Academics", icon: <BookOpenCheck className="size-4" /> },
          { value: "teachers", label: "Teachers", icon: <Users className="size-4" />, count: teachers.length },
          { value: "fees", label: "Fees", icon: <Wallet className="size-4" /> },
        ]}
      />

      {tab === "academics" && (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <Card padded={false}>
              <UnderDevelopment
                title="Gradebook not available yet"
                description="The school system doesn't have an assessments/grades module yet — attendance (alongside) is real and live."
                className="py-10"
              />
            </Card>
          </div>
          <Card>
            <CardHeader title="Recent attendance" />
            <ul className="space-y-2">
              {(realAttendance?.recent ?? []).slice(0, 10).map((r) => {
                const meta = ATTENDANCE_STATUS[r.status];
                return (
                  <li key={r.id} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 text-muted">
                      <CalendarCheck className="size-3.5" />
                      <span className="tnum">{formatDate("date" in r ? r.date : "")}</span>
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </li>
                );
              })}
              {(realAttendance?.recent ?? []).length === 0 && (
                <p className="text-[13px] text-muted py-4 text-center">No attendance records yet.</p>
              )}
            </ul>
          </Card>
        </div>
      )}

      {tab === "teachers" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <Card key={t.id} hover>
              <div className="flex items-start gap-3">
                <Avatar name={t.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[15px] text-ink">{t.name}</p>
                  <p className="text-[12.5px] text-muted">{t.subjects.join(" · ") || "—"}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<MessageSquare className="size-3.5" />}
                className="mt-4 w-full"
                onClick={() => setMessageTo(t)}
              >
                Message teacher
              </Button>
            </Card>
          ))}
          {teachers.length === 0 && (
            <p className="text-muted text-[13.5px] col-span-full py-8 text-center">No teachers assigned to this class yet.</p>
          )}
        </div>
      )}

      {tab === "fees" && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
          <Card padded={false} className="min-w-0">
            <CardHeader
              className="px-5 pt-5"
              title="Balance"
              description="Pay from the Fees & payments page; receipts are automatic."
            />
            <DataTable
              columns={[
                { key: "feeName", header: "Fee" },
                { key: "category", header: "Category", render: (b: FeeBalance) => FEE_CATEGORY_LABEL[b.category] },
                { key: "billed", header: "Billed", align: "right", render: (b) => <span className="tnum">{formatRWF(b.billed)}</span> },
                { key: "paid", header: "Paid", align: "right", render: (b) => <span className="tnum text-primary-deep">{formatRWF(b.paid)}</span> },
                {
                  key: "due",
                  header: "Due",
                  align: "right",
                  render: (b) => <span className={`tnum font-semibold ${b.due ? "text-clay-deep" : "text-muted"}`}>{formatRWF(b.due)}</span>,
                },
              ]}
              rows={balances}
              keyField={(b) => b.feeStructureId}
              empty="No fees charged yet."
            />
          </Card>

          <Card className={totalDue ? "bg-primary-soft/40 border-primary/25" : undefined}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[13px] font-semibold text-ink">Due</p>
              <p className={`font-display font-bold text-[16px] tnum ${totalDue ? "text-clay-deep" : "text-primary-deep"}`}>
                {formatRWF(totalDue)}
              </p>
            </div>
            <p className="text-[12px] text-muted mb-3">
              {totalDue
                ? "Settle outstanding fees from Fees & payments — every payment issues a digital receipt automatically."
                : "Everything is settled. Receipts for past payments live under Receipts."}
            </p>
            <Button icon={<Wallet className="size-4" />} onClick={() => navigate("/parent/payments")}>
              Go to payments
            </Button>
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(messageTo)}
        onClose={() => setMessageTo(null)}
        title={`Message ${messageTo?.name ?? ""}`}
        description={`About ${fullName(student)} · ${messageTo?.subjects.join(", ") ?? ""}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMessageTo(null)}>Cancel</Button>
            <Button loading={startThread.isPending} disabled={!messageBody.trim()} onClick={() => startThread.mutate()}>
              Send
            </Button>
          </>
        }
      >
        <Textarea
          label="Your message"
          placeholder="Muraho! I'd like to ask about…"
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          rows={5}
        />
      </Modal>
    </PageTransition>
  );
}
