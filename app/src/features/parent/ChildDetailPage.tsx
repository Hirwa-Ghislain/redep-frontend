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
import { useAuth } from "@/hooks/useAuth";
import { academicService } from "@/services/academicService";
import { commsService } from "@/services/commsService";
import { feeService } from "@/services/feeService";
import { studentService } from "@/services/studentService";
import { toast } from "@/stores/uiStore";
import { formatDate, formatRWF, fullName, percent } from "@/lib/format";
import { ATTENDANCE_STATUS, STUDENT_STATUS } from "@/lib/status";
import type { TeacherProfile } from "@/types";

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
  const { data: term } = useQuery({ queryKey: ["current-term"], queryFn: () => academicService.currentTerm() });
  const { data: academics } = useQuery({
    queryKey: ["student-academics", studentId],
    queryFn: () => academicService.studentSummary(studentId),
  });
  const { data: balances = [] } = useQuery({
    queryKey: ["balances", studentId, term?.id],
    queryFn: () => feeService.balances(studentId, term!.id),
    enabled: Boolean(term),
  });

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
                {academics ? percent(academics.attendanceRate) : "…"}
              </p>
              <p className="text-[11px] text-muted">Attendance</p>
            </div>
            <div className="text-right">
              <p className={`font-display font-bold text-[16px] tnum leading-5 ${totalDue ? "text-clay-deep" : "text-primary-deep"}`}>
                {formatRWF(totalDue)}
              </p>
              <p className="text-[11px] text-muted">Due this term</p>
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
              <CardHeader className="px-5 pt-5" title="Assessments & grades" description="Recorded by teachers throughout the year." />
              <DataTable
                columns={[
                  { key: "date", header: "Date", render: (a: NonNullable<typeof academics>["assessments"][number]) => <span className="tnum">{formatDate(a.date)}</span> },
                  { key: "subject", header: "Subject" },
                  { key: "title", header: "Assessment" },
                  {
                    key: "score",
                    header: "Score",
                    align: "right",
                    render: (a) =>
                      a.grade ? (
                        <span className={`tnum font-semibold ${a.grade.score / a.maxScore >= 0.5 ? "text-primary-deep" : "text-clay-deep"}`}>
                          {a.grade.score}/{a.maxScore}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      ),
                  },
                ]}
                rows={academics?.assessments ?? []}
                keyField={(a) => a.id}
                pageSize={8}
                empty="No assessments recorded yet."
              />
            </Card>
            {academics?.assessments.some((a) => a.grade?.comment) && (
              <Card className="mt-4">
                <CardHeader title="Teacher comments" />
                <ul className="space-y-3">
                  {academics.assessments
                    .filter((a) => a.grade?.comment)
                    .slice(0, 4)
                    .map((a) => (
                      <li key={a.id} className="rounded-xl bg-paper/70 border border-line px-4 py-3">
                        <p className="text-[13.5px] text-ink">“{a.grade!.comment}”</p>
                        <p className="text-[12px] text-faint mt-1">{a.subject} · {a.title}</p>
                      </li>
                    ))}
                </ul>
              </Card>
            )}
          </div>
          <Card>
            <CardHeader title="Recent attendance" />
            <ul className="space-y-2">
              {(academics?.recentAttendance ?? []).slice(0, 10).map((r) => {
                const meta = ATTENDANCE_STATUS[r.status];
                return (
                  <li key={r.id} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 text-muted">
                      <CalendarCheck className="size-3.5" />
                      <span className="tnum">{formatDate(r.date)}</span>
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </li>
                );
              })}
              {(academics?.recentAttendance ?? []).length === 0 && (
                <p className="text-[13px] text-muted py-4 text-center">No attendance records yet.</p>
              )}
            </ul>
          </Card>
        </div>
      )}

      {tab === "teachers" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {teachers.map((t) => (
            <Card key={t.id} hover>
              <div className="flex items-start gap-3">
                <Avatar name={t.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[15px] text-ink">{t.name}</p>
                  <p className="text-[12.5px] text-muted">{t.subjects.join(" · ")}</p>
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
        <div className="max-w-3xl">
          <Card padded={false}>
            <CardHeader className="px-5 pt-5" title={`Balance — ${term?.label ?? ""}`} description="Pay from the Fees & payments page; receipts are automatic." />
            <DataTable
              columns={[
                { key: "feeName", header: "Fee" },
                { key: "billed", header: "Billed", align: "right", render: (b: (typeof balances)[number]) => <span className="tnum">{formatRWF(b.billed)}</span> },
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
              empty="No fees configured for this term."
            />
          </Card>
          <Button className="mt-4" icon={<Wallet className="size-4" />} onClick={() => navigate("/parent/payments")}>
            Go to payments
          </Button>
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
